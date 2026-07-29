import prisma from "../../config/db.js";
import { badRequest, conflict, notFound } from "../../utils/httpError.js";
import { logActivity } from "../../utils/activityLog.js";
import { promoteIfEligible } from "../members/members.service.js";

const withBarangay = { barangay: { select: { id: true, name: true } } };

// Builds the next "APP-0001"-style application number from the current max.
async function nextApplicationNo() {
  const applications = await prisma.membershipApplication.findMany({
    where: { applicationNo: { startsWith: "APP-" } },
    select: { applicationNo: true },
  });
  let max = 0;
  for (const a of applications) {
    const n = parseInt(a.applicationNo.slice(4), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `APP-${String(max + 1).padStart(4, "0")}`;
}

// Public: a prospective member submits an application.
export async function create(data) {
  return prisma.membershipApplication.create({
    data: {
      applicationNo: await nextApplicationNo(),
      firstName: data.firstName,
      middleName: data.middleName ?? null,
      lastName: data.lastName,
      sex: data.sex ?? null,
      birthdate: data.birthdate ? new Date(data.birthdate) : null,
      address: data.address ?? null,
      barangayId: data.barangayId ?? null,
      contactNo: data.contactNo ?? null,
      email: data.email ?? null,
      reason: data.reason ?? null,
    },
    select: { id: true, applicationNo: true, firstName: true, lastName: true, status: true, createdAt: true },
  });
}

// Public: barangay options for the application form.
export function publicBarangays() {
  return prisma.barangay.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function list({ status, search, barangayId }) {
  const where = {};
  if (status) where.status = status;
  if (barangayId) where.barangayId = Number(barangayId);
  if (search) where.applicationNo = { contains: search };
  return prisma.membershipApplication.findMany({
    where,
    include: withBarangay,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function getById(id) {
  const app = await prisma.membershipApplication.findUnique({
    where: { id },
    include: withBarangay,
  });
  if (!app) throw notFound("Application not found");
  return app;
}

// Builds the next "M-0001"-style member number from the current max.
async function nextMemberNo() {
  const members = await prisma.member.findMany({
    where: { memberNo: { startsWith: "M-" } },
    select: { memberNo: true },
  });
  let max = 0;
  for (const m of members) {
    const n = parseInt(m.memberNo.slice(2), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `M-${String(max + 1).padStart(4, "0")}`;
}

// Approve: create a real Member from the application, then mark it approved.
// New members always start as ASSOCIATE; they are auto-promoted to REGULAR once
// their CBU or savings reach the threshold (see promoteIfEligible).
export async function approve(id, { memberNo }, actorId) {
  const app = await getById(id);
  if (app.status !== "PENDING") throw badRequest("This application has already been reviewed");

  const finalMemberNo = memberNo?.trim() || (await nextMemberNo());
  const taken = await prisma.member.findUnique({ where: { memberNo: finalMemberNo } });
  if (taken) throw conflict(`Member number ${finalMemberNo} is already in use`);

  const member = await prisma.member.create({
    data: {
      memberNo: finalMemberNo,
      firstName: app.firstName,
      middleName: app.middleName,
      lastName: app.lastName,
      sex: app.sex,
      birthdate: app.birthdate,
      address: app.address,
      barangayId: app.barangayId,
      contactNo: app.contactNo,
      membershipType: "ASSOCIATE",
      dateJoined: new Date(),
      status: "ACTIVE",
    },
  });

  await prisma.membershipApplication.update({
    where: { id },
    data: {
      status: "APPROVED",
      reviewedByUserId: actorId,
      reviewedAt: new Date(),
      memberId: member.id,
    },
  });

  await logActivity(actorId, `Approved membership application #${id} as ${finalMemberNo}`);

  // If they were approved with >= threshold savings, promote immediately.
  await promoteIfEligible(member.id).catch(() => {});
  return prisma.member.findUnique({ where: { id: member.id } });
}

export async function reject(id, note, actorId) {
  const app = await getById(id);
  if (app.status !== "PENDING") throw badRequest("This application has already been reviewed");

  const updated = await prisma.membershipApplication.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewNote: note ?? null,
      reviewedByUserId: actorId,
      reviewedAt: new Date(),
    },
    include: withBarangay,
  });

  await logActivity(actorId, `Rejected membership application #${id}`);
  return updated;
}

// Move a rejected application back to PENDING so staff can review it again.
export async function reconsider(id, actorId) {
  const app = await getById(id);
  if (app.status !== "REJECTED") throw badRequest("Only rejected applications can be reconsidered");

  const updated = await prisma.membershipApplication.update({
    where: { id },
    data: { status: "PENDING", reviewNote: null, reviewedByUserId: null, reviewedAt: null },
    include: withBarangay,
  });

  await logActivity(actorId, `Reopened membership application #${id} for reconsideration`);
  return updated;
}

// Undo an approval: hard-delete the Member the approval created, then flip the
// application back to PENDING (unlinked). No FK cascade member→children exists,
// so children are removed first, in dependency order, inside one txn.
// ponytail: destructive — wipes the member's deliveries, receipts, loans,
// payments, credit scores and program grants. A linked user login and past
// notifications are SetNull'd by the DB (orphaned, not deleted). Use the
// "delete only if untouched" guard instead if that data loss ever bites.
export async function unapprove(id, actorId) {
  const app = await getById(id);
  if (app.status !== "APPROVED") throw badRequest("Only approved applications can be reverted");

  const memberId = app.memberId;
  await prisma.$transaction([
    ...(memberId
      ? [
          prisma.loanPayment.deleteMany({ where: { OR: [{ loan: { memberId } }, { delivery: { memberId } }] } }),
          prisma.receipt.deleteMany({ where: { memberId } }),
          prisma.rubberDelivery.deleteMany({ where: { memberId } }),
          prisma.loanApplication.deleteMany({ where: { memberId } }),
          prisma.loan.deleteMany({ where: { memberId } }),
          prisma.creditScore.deleteMany({ where: { memberId } }),
          prisma.supportProgramRecipient.deleteMany({ where: { memberId } }),
        ]
      : []),
    prisma.membershipApplication.update({
      where: { id },
      data: { status: "PENDING", memberId: null, reviewedByUserId: null, reviewedAt: null },
    }),
    ...(memberId ? [prisma.member.delete({ where: { id: memberId } })] : []),
  ]);

  await logActivity(actorId, `Reverted approved membership application #${id} — deleted member #${memberId}`);
  return getById(id);
}

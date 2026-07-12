import prisma from "../../config/db.js";
import { badRequest, conflict, notFound } from "../../utils/httpError.js";
import { logActivity } from "../../utils/activityLog.js";
import { promoteIfEligible } from "../members/members.service.js";

const withBarangay = { barangay: { select: { id: true, name: true } } };

// Public: a prospective member submits an application.
export async function create(data) {
  return prisma.membershipApplication.create({
    data: {
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
    select: { id: true, firstName: true, lastName: true, status: true, createdAt: true },
  });
}

// Public: barangay options for the application form.
export function publicBarangays() {
  return prisma.barangay.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function list({ status }) {
  const where = {};
  if (status) where.status = status;
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

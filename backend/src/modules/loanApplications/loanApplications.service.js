import prisma from "../../config/db.js";
import { badRequest, conflict, notFound } from "../../utils/httpError.js";
import { logActivity } from "../../utils/activityLog.js";
import { create as createNotification } from "../notifications/notifications.service.js";
import * as loans from "../finance/loans.service.js";
import { promoteIfEligible, REGULAR_PROMOTION_THRESHOLD } from "../members/members.service.js";

const peso = (n) => `₱${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

// Standard cooperative loan interest (%/month) if the applicant doesn't set one.
const DEFAULT_INTEREST = 5;

const memberSelect = {
  member: {
    select: {
      id: true,
      memberNo: true,
      firstName: true,
      lastName: true,
      membershipType: true,
      barangay: { select: { id: true, name: true } },
    },
  },
};

// Builds the next "LN-0001"-style loan-application number from the current max.
async function nextApplicationNo() {
  const apps = await prisma.loanApplication.findMany({
    where: { applicationNo: { startsWith: "LN-" } },
    select: { applicationNo: true },
  });
  let max = 0;
  for (const a of apps) {
    const n = parseInt(a.applicationNo.slice(3), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `LN-${String(max + 1).padStart(4, "0")}`;
}

// A member applies for a loan. Only Regular members qualify, and only one
// application may be pending at a time.
export async function create(memberId, data) {
  // Eligibility = Regular membership; re-check promotion so a member who has hit
  // the CBU threshold can apply even if promotion hadn't fired yet.
  const member = await promoteIfEligible(memberId);
  if (!member) throw badRequest("Member not found");
  if (member.membershipType !== "REGULAR") {
    throw badRequest(
      `You are not eligible for a loan yet. Members qualify once their CBU reaches ₱${REGULAR_PROMOTION_THRESHOLD.toLocaleString()}.`
    );
  }

  const pending = await prisma.loanApplication.findFirst({
    where: { memberId, status: "PENDING" },
  });
  if (pending) throw conflict("You already have a pending loan application");

  const app = await prisma.loanApplication.create({
    data: {
      applicationNo: await nextApplicationNo(),
      memberId,
      principalAmount: data.principalAmount,
      termMonths: data.termMonths,
      interestRate: data.interestRate ?? DEFAULT_INTEREST,
      purpose: data.purpose ?? null,
    },
    select: { id: true, applicationNo: true, status: true, createdAt: true },
  });

  // Notify staff/admin so they can review it. One row per role (notifications
  // are addressed by a single role). Non-fatal if it fails.
  const message = `${member.memberNo} applied for a ${peso(data.principalAmount)} loan over ${data.termMonths} month(s). Application ${app.applicationNo}.`;
  for (const role of ["ADMIN", "STAFF"]) {
    await createNotification({ title: "New loan application", message, recipientRole: role }, null).catch(() => {});
  }

  return app;
}

export function list({ status, search, barangayId }) {
  const where = {};
  if (status) where.status = status;
  if (search) where.applicationNo = { contains: search };
  if (barangayId) where.member = { barangayId: Number(barangayId) };
  return prisma.loanApplication.findMany({
    where,
    include: memberSelect,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export function listForMember(memberId) {
  return prisma.loanApplication.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getById(id) {
  const app = await prisma.loanApplication.findUnique({ where: { id }, include: memberSelect });
  if (!app) throw notFound("Loan application not found");
  return app;
}

// Approve: create the actual Loan (staff may adjust the terms), then mark the
// application approved and link it to the new loan.
export async function approve(id, overrides, actorId) {
  const app = await getById(id);
  if (app.status !== "PENDING") throw badRequest("This application has already been reviewed");

  // loans.create re-checks the Regular-member rule and refreshes categorization.
  const loan = await loans.create(
    {
      memberId: app.memberId,
      principalAmount: overrides.principalAmount ?? Number(app.principalAmount),
      interestRate: overrides.interestRate ?? Number(app.interestRate),
      termMonths: overrides.termMonths ?? app.termMonths,
      dateIssued: overrides.dateIssued ?? null,
    },
    actorId
  );

  await prisma.loanApplication.update({
    where: { id },
    data: {
      status: "APPROVED",
      reviewedByUserId: actorId,
      reviewedAt: new Date(),
      loanId: loan.id,
    },
  });

  await logActivity(actorId, `Approved loan application ${app.applicationNo} → loan #${loan.id}`);

  await createNotification(
    {
      title: "Loan application approved",
      message: `Your loan application ${app.applicationNo} has been approved. A loan of ${peso(loan.principalAmount)} over ${loan.termMonths} month(s) has been issued.`,
      recipientMemberId: app.memberId,
    },
    actorId
  ).catch(() => {});

  return loan;
}

export async function reject(id, note, actorId) {
  const app = await getById(id);
  if (app.status !== "PENDING") throw badRequest("This application has already been reviewed");

  const updated = await prisma.loanApplication.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewNote: note ?? null,
      reviewedByUserId: actorId,
      reviewedAt: new Date(),
    },
    include: memberSelect,
  });

  await logActivity(actorId, `Rejected loan application ${app.applicationNo}`);

  await createNotification(
    {
      title: "Loan application rejected",
      message: `Your loan application ${app.applicationNo} was not approved.${note ? ` Reason: ${note}` : ""}`,
      recipientMemberId: app.memberId,
    },
    actorId
  ).catch(() => {});

  return updated;
}

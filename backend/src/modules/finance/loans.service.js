import prisma from "../../config/db.js";
import { notFound, badRequest } from "../../utils/httpError.js";
import { logActivity } from "../../utils/activityLog.js";
import { evaluateAndSave } from "../progression/progression.service.js";
import { promoteIfEligible, REGULAR_PROMOTION_THRESHOLD } from "../members/members.service.js";

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

// ---------------------------------------------------------------------------
// Diminishing-interest amortization — "Equal principal + diminishing interest".
// Each period: fixed principal, interest = outstanding balance x periodic rate,
// so the total payment decreases over the term. (Operational Definition:
// interest is based on the remaining balance, not the original principal.)
// ---------------------------------------------------------------------------
export function buildSchedule(principal, monthlyRatePct, termMonths, startDate) {
  const rate = Number(monthlyRatePct) / 100;
  const basePrincipal = round2(Number(principal) / termMonths);
  let balance = Number(principal);
  const rows = [];

  for (let n = 1; n <= termMonths; n++) {
    const interestDue = round2(balance * rate);
    // Last period absorbs any rounding remainder so the balance closes at 0.
    const principalDue = n === termMonths ? round2(balance) : basePrincipal;
    const totalDue = round2(principalDue + interestDue);
    rows.push({
      periodNo: n,
      dueDate: addMonths(startDate, n),
      principalDue,
      interestDue,
      totalDue,
    });
    balance = round2(balance - principalDue);
  }
  return rows;
}

const loanInclude = {
  member: { select: { id: true, memberNo: true, firstName: true, lastName: true } },
};

export async function list({ memberId, search, barangayId } = {}) {
  const where = {};
  if (memberId) where.memberId = Number(memberId);

  const memberWhere = {};
  if (barangayId) memberWhere.barangayId = Number(barangayId);
  if (search) {
    memberWhere.OR = [
      { memberNo: { contains: search } },
      { firstName: { contains: search } },
      { lastName: { contains: search } },
    ];
  }
  if (Object.keys(memberWhere).length > 0) where.member = memberWhere;

  return prisma.loan.findMany({
    where,
    orderBy: { dateIssued: "desc" },
    include: { ...loanInclude, _count: { select: { schedule: true } } },
  });
}

export async function getById(id) {
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      ...loanInclude,
      schedule: { orderBy: { periodNo: "asc" } },
      payments: {
        orderBy: { paymentDate: "desc" },
        include: { delivery: { select: { id: true, deliveryDate: true, weightKg: true } } },
      },
    },
  });
  if (!loan) throw notFound("Loan not found");
  return loan;
}

export async function create(data, actorId) {
  // Loan eligibility = Regular membership, which a member reaches once CBU or
  // savings hit the threshold. Re-check promotion first so anyone who has met
  // the threshold qualifies even if an earlier trigger didn't fire.
  const member = await promoteIfEligible(data.memberId);
  if (!member) throw badRequest("Member does not exist");
  if (member.membershipType !== "REGULAR") {
    throw badRequest(
      `Member is not eligible for a loan yet. Members qualify once CBU or savings reach ₱${REGULAR_PROMOTION_THRESHOLD.toLocaleString()}.`
    );
  }
  if (data.termMonths < 1) throw badRequest("Term must be at least 1 month");

  const dateIssued = data.dateIssued ? new Date(data.dateIssued) : new Date();
  const schedule = buildSchedule(
    data.principalAmount,
    data.interestRate,
    data.termMonths,
    dateIssued
  );

  const loan = await prisma.loan.create({
    data: {
      memberId: data.memberId,
      principalAmount: data.principalAmount,
      interestRate: data.interestRate,
      termMonths: data.termMonths,
      remainingBalance: data.principalAmount,
      dateIssued,
      schedule: { create: schedule },
    },
    include: { ...loanInclude, schedule: { orderBy: { periodNo: "asc" } } },
  });

  await logActivity(
    actorId,
    `Issued loan ₱${data.principalAmount} (${data.termMonths} mo @ ${data.interestRate}%/mo) to ${member.memberNo}`
  );

  // A new loan changes the member's Loan Score inputs — refresh categorization.
  await evaluateAndSave(data.memberId).catch(() => {});
  return loan;
}

const fmt = (n) =>
  Number(Math.round(Number(n) * 100) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Step-by-step explanation of the diminishing-interest amortization: the fixed
// principal, then each period's interest = remaining balance × monthly rate.
export async function explainSchedule(loanId) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { schedule: { orderBy: { periodNo: "asc" } } },
  });
  if (!loan) return null;

  const principal = Number(loan.principalAmount);
  const rate = Number(loan.interestRate);
  const term = loan.termMonths;
  const principalPer = Math.round((principal / term) * 100) / 100;

  const steps = [
    {
      label: "Fixed principal per period",
      formula: "principal ÷ term",
      substitution: `₱${fmt(principal)} ÷ ${term} months`,
      result: `₱${fmt(principalPer)}`,
    },
  ];

  let balance = principal;
  for (const r of loan.schedule) {
    const before = balance;
    steps.push({
      label: `Period ${r.periodNo} — due ${new Date(r.dueDate).toISOString().slice(0, 10)}`,
      formula: "interest = balance × rate;  total = principal + interest",
      substitution: `interest = ₱${fmt(before)} × ${rate}% = ₱${fmt(
        r.interestDue
      )};  total = ₱${fmt(r.principalDue)} + ₱${fmt(r.interestDue)}`,
      result: `₱${fmt(r.totalDue)}  (balance after: ₱${fmt(before - Number(r.principalDue))})`,
    });
    balance = Math.round((before - Number(r.principalDue)) * 100) / 100;
  }

  const totalPaid = loan.schedule.reduce((s, r) => s + Number(r.totalDue), 0);
  const totalInterest = loan.schedule.reduce((s, r) => s + Number(r.interestDue), 0);

  return {
    title: "Diminishing-Interest Amortization",
    description: `Equal-principal method: each month the interest is charged on the REMAINING balance (× ${rate}%/mo), so the total payment decreases over the ${term}-month term. Total interest: ₱${fmt(
      totalInterest
    )}.`,
    steps,
    result: { label: "Total of all payments", value: `₱${fmt(totalPaid)}` },
  };
}

// ---------------------------------------------------------------------------
// Applies a delivery's proceeds to the member's active loan, following the
// "scheduled installment per period" rule: only installments that are already
// due (dueDate <= delivery date) are collected, capped by the delivery amount.
// Earliest installments are paid first. Principal balance drops as installments
// are fully settled. Runs inside the delivery-creation transaction.
// Returns the amount deducted (0 if no active loan / nothing due).
// ---------------------------------------------------------------------------
export async function applyDeliveryToLoan(tx, memberId, availableAmount, deliveryId, date) {
  const loan = await tx.loan.findFirst({
    where: { memberId, status: "ACTIVE" },
    include: { schedule: { orderBy: { periodNo: "asc" } } },
    orderBy: { dateIssued: "asc" },
  });
  if (!loan) return 0;

  const due = loan.schedule.filter(
    (r) => r.status !== "PAID" && new Date(r.dueDate) <= new Date(date)
  );
  const outstandingDue = round2(
    due.reduce((s, r) => s + (Number(r.totalDue) - Number(r.amountPaid)), 0)
  );

  let remaining = round2(Math.min(Number(availableAmount), outstandingDue));
  if (remaining <= 0) return 0;

  let principalReduction = 0;
  for (const row of due) {
    if (remaining <= 0) break;
    const need = round2(Number(row.totalDue) - Number(row.amountPaid));
    const pay = round2(Math.min(need, remaining));
    const newPaid = round2(Number(row.amountPaid) + pay);
    const paidOff = newPaid >= Number(row.totalDue);

    await tx.loanSchedule.update({
      where: { id: row.id },
      data: { amountPaid: newPaid, status: paidOff ? "PAID" : "PARTIAL" },
    });

    if (paidOff) principalReduction = round2(principalReduction + Number(row.principalDue));
    remaining = round2(remaining - pay);
  }

  const totalDeducted = round2(Math.min(Number(availableAmount), outstandingDue) - remaining);
  if (totalDeducted <= 0) return 0;

  // Did this clear the whole loan?
  const unpaidLeft = await tx.loanSchedule.count({
    where: { loanId: loan.id, status: { not: "PAID" } },
  });
  const newBalance = round2(Math.max(0, Number(loan.remainingBalance) - principalReduction));

  await tx.loan.update({
    where: { id: loan.id },
    data: {
      remainingBalance: unpaidLeft === 0 ? 0 : newBalance,
      status: unpaidLeft === 0 ? "INACTIVE" : "ACTIVE",
    },
  });

  await tx.loanPayment.create({
    data: { loanId: loan.id, deliveryId, amountDeducted: totalDeducted, paymentDate: new Date(date) },
  });

  return totalDeducted;
}

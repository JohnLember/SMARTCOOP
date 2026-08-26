import prisma from "../../config/db.js";
import { notFound, badRequest } from "../../utils/httpError.js";
import { logActivity } from "../../utils/activityLog.js";
import { evaluateAndSave } from "../progression/progression.service.js";
import { promoteIfEligible, REGULAR_PROMOTION_THRESHOLD, memberSearchWhere } from "../members/members.service.js";
import { planAllocation, deriveLoanState, statusFor, minPaymentFor, MIN_PAYMENT } from "./allocate.js";
import * as notifications from "../notifications/notifications.service.js";

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
  if (search) Object.assign(memberWhere, memberSearchWhere(search));
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
        orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
        include: {
          delivery: { select: { id: true, deliveryDate: true, weightKg: true } },
          recordedBy: { select: { username: true } },
        },
      },
    },
  });
  if (!loan) throw notFound("Loan not found");
  return loan;
}

export async function create(data, actorId) {
  // Loan eligibility = Regular membership, which a member reaches once CBU hits
  // the threshold. Re-check promotion first so anyone who has met the threshold
  // qualifies even if an earlier trigger didn't fire.
  const member = await promoteIfEligible(data.memberId);
  if (!member) throw badRequest("Member does not exist");
  if (member.membershipType !== "REGULAR") {
    throw badRequest(
      `Member is not eligible for a loan yet. Members qualify once their CBU reaches ₱${REGULAR_PROMOTION_THRESHOLD.toLocaleString()}.`
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
// Manual loan payments.
//
// This replaced an automatic deduction that took due installments out of a
// member's rubber delivery proceeds. That was wrong for this cooperative:
// members pay their amortization in cash at the office, and the system's job is
// only to RECORD that it happened. There is no online payment anywhere here.
//
// Two rules make the whole thing work:
//   1. The allocation is planned by a pure function and STORED on the payment,
//      so a void replays what actually happened instead of guessing.
//   2. The loan's balance and status are DERIVED from its schedule after every
//      change, never incremented or decremented - so record and void are the
//      same operation over different rows, and neither can drift.
// ---------------------------------------------------------------------------

// The payment's own reference, printed on the acknowledgment slip. Staff never
// type it — it is generated here.
//
// Derived from the row id rather than counting existing rows (the "APP-0001"
// pattern used elsewhere). Voiding deletes the row, so a max+1 counter would
// hand the next payment a number a voided slip is already printed with — two
// different pieces of paper claiming to be LP-0005. Ids are never reused, so
// this cannot collide. Gaps in the sequence are the correct outcome of a void.
const paymentNoFor = (id) => `LP-${String(id).padStart(4, "0")}`;

const paymentInclude = {
  recordedBy: { select: { username: true } },
  loan: {
    include: {
      member: {
        select: {
          id: true,
          memberNo: true,
          firstName: true,
          middleName: true,
          lastName: true,
          barangay: { select: { name: true } },
        },
      },
      schedule: { orderBy: { periodNo: "asc" } },
    },
  },
};

export async function getPaymentById(id) {
  const payment = await prisma.loanPayment.findUnique({ where: { id }, include: paymentInclude });
  if (!payment) throw notFound("Payment not found");
  return payment;
}

// Re-derives the loan row from its schedule. Called after any change to the
// rows, by both record and void.
async function syncLoanState(tx, loanId) {
  const loan = await tx.loan.findUnique({
    where: { id: loanId },
    include: { schedule: { orderBy: { periodNo: "asc" } } },
  });
  const state = deriveLoanState(loan.schedule, loan.principalAmount);
  await tx.loan.update({ where: { id: loanId }, data: state });
  return state;
}

// Records a payment against one period of the amortization schedule. Anything
// above that period's outstanding spills forward into the next unpaid periods
// (see planAllocation) - a member settling three months at once is one payment,
// not three.
export async function recordPayment(loanId, data, actorId) {
  const amount = Number(data.amount);
  if (!(amount > 0)) throw badRequest("Payment amount must be greater than zero");

  const payment = await prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({
      where: { id: loanId },
      include: { schedule: { orderBy: { periodNo: "asc" } } },
    });
    if (!loan) throw notFound("Loan not found");

    const anchor = loan.schedule.find((r) => r.id === Number(data.scheduleId));
    if (!anchor) throw badRequest("That installment does not belong to this loan");
    if (anchor.status === "PAID") throw badRequest(`Period ${anchor.periodNo} is already fully paid`);

    // Floor and ceiling. The floor is normally MIN_PAYMENT, but drops to the
    // remaining balance when that is smaller, so a loan with a few pesos left is
    // still closable — otherwise no amount would satisfy both this and the
    // no-overpayment rule below.
    const minimum = minPaymentFor(loan.schedule, anchor.periodNo);
    if (amount < minimum) {
      throw badRequest(
        minimum < MIN_PAYMENT
          ? `Only ₱${fmt(minimum)} is left on this loan — pay exactly that to close it.`
          : `The smallest payment the cooperative accepts is ₱${fmt(MIN_PAYMENT)}.`
      );
    }

    const { plan, applied, unapplied } = planAllocation(loan.schedule, amount, anchor.periodNo);

    // Refuse rather than quietly keeping money the schedule has no room for.
    if (unapplied > 0) {
      throw badRequest(
        `This loan only has ₱${fmt(applied)} outstanding from period ${anchor.periodNo} onward. Enter that amount or less.`
      );
    }

    for (const row of plan) {
      await tx.loanSchedule.update({
        where: { id: row.scheduleId },
        data: { amountPaid: row.newPaid, status: row.status },
      });
    }

    const created = await tx.loanPayment.create({
      data: {
        loanId: loan.id,
        scheduleId: anchor.id,
        amount: applied,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        // No referenceNo: the payment number above IS the reference, generated
        // here rather than typed in. The column survives for rows recorded while
        // staff still entered one by hand.
        remarks: data.remarks?.trim() || null,
        recordedByUserId: actorId ?? null,
        allocations: plan.map((r) => ({
          scheduleId: r.scheduleId,
          periodNo: r.periodNo,
          amount: r.amount,
        })),
      },
    });

    // The number needs the id, so it is stamped on immediately after the insert,
    // inside the same transaction — a payment is never visible without one.
    const numbered = await tx.loanPayment.update({
      where: { id: created.id },
      data: { paymentNo: paymentNoFor(created.id) },
    });

    await syncLoanState(tx, loan.id);
    return numbered;
  });

  const full = await getPaymentById(payment.id);
  const member = full.loan.member;

  await logActivity(
    actorId,
    `Recorded loan payment ${full.paymentNo} of ₱${fmt(full.amount)} for ${member.memberNo}`
  );

  await notifications
    .create(
      {
        title: "Loan payment recorded",
        message: `Your payment of ₱${fmt(full.amount)} was recorded (${full.paymentNo}). Remaining balance: ₱${fmt(
          full.loan.remainingBalance
        )}.`,
        recipientMemberId: member.id,
      },
      actorId
    )
    .catch(() => {});

  // Repayment feeds both the credit score and the activity category.
  await evaluateAndSave(member.id).catch(() => {});

  return full;
}

// Reverses a payment completely: every period it touched goes back to what it
// was, the balance is re-derived, and a loan that closed on this payment
// reopens. Only correct because the allocation was stored - do not try to infer
// it from the schedule's current state.
// ponytail: hard delete, no void-audit row. If the cooperative ever needs to
// show that a payment existed and was cancelled, add a `voidedAt` column and
// filter it out of the lists instead of deleting.
export async function voidPayment(paymentId, actorId) {
  const voided = await prisma.$transaction(async (tx) => {
    const payment = await tx.loanPayment.findUnique({
      where: { id: paymentId },
      include: { loan: { include: { member: { select: { id: true, memberNo: true } } } } },
    });
    if (!payment) throw notFound("Payment not found");
    if (!payment.paymentNo) {
      throw badRequest("This is a legacy delivery deduction and cannot be voided here");
    }

    for (const alloc of payment.allocations ?? []) {
      const row = await tx.loanSchedule.findUnique({ where: { id: alloc.scheduleId } });
      if (!row) continue; // schedule row is gone; nothing to give back
      const amountPaid = Math.max(0, round2(Number(row.amountPaid) - Number(alloc.amount)));
      await tx.loanSchedule.update({
        where: { id: row.id },
        data: { amountPaid, status: statusFor(row.totalDue, amountPaid) },
      });
    }

    await tx.loanPayment.delete({ where: { id: paymentId } });
    await syncLoanState(tx, payment.loanId);

    return {
      memberNo: payment.loan.member.memberNo,
      memberId: payment.loan.member.id,
      paymentNo: payment.paymentNo,
      amount: Number(payment.amount),
    };
  });

  await logActivity(
    actorId,
    `Voided loan payment ${voided.paymentNo} (₱${fmt(voided.amount)}) for ${voided.memberNo}`
  );
  await evaluateAndSave(voided.memberId).catch(() => {});
  return { voided: voided.paymentNo };
}

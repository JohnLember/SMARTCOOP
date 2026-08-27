import { z } from "zod";
import * as loans from "./loans.service.js";
import * as credit from "./credit.service.js";
import { forbidden, notFound } from "../../utils/httpError.js";
import { assertMemberAccess, memberScopeFor } from "../../utils/access.js";

const isStaff = (user) => user.role === "ADMIN" || user.role === "STAFF";

// --- Loans ---

const loanSchema = z.object({
  memberId: z.number().int().positive(),
  principalAmount: z.number().positive(),
  interestRate: z.number().min(0).max(100),
  termMonths: z.number().int().min(1).max(120),
  dateIssued: z.string().optional().nullable(),
});

export async function listLoans(req, res, next) {
  try {
    // Staff see every loan; a member sees only their own; nobody else.
    const scope = memberScopeFor(req.user);
    if (scope !== null) return res.json(await loans.list({ memberId: scope }));
    res.json(await loans.list(req.query));
  } catch (err) {
    next(err);
  }
}

export async function getLoan(req, res, next) {
  try {
    const loan = await loans.getById(Number(req.params.id));
    assertMemberAccess(req.user, loan.memberId, "loans");
    res.json(loan);
  } catch (err) {
    next(err);
  }
}

export async function createLoan(req, res, next) {
  try {
    if (!isStaff(req.user)) throw forbidden("Only staff can issue loans");
    res.status(201).json(await loans.create(loanSchema.parse(req.body), req.user.id));
  } catch (err) {
    next(err);
  }
}

// --- Agricultural Credit Scoring ---

export async function listCreditScores(_req, res, next) {
  try {
    res.json(await credit.listLatest());
  } catch (err) {
    next(err);
  }
}

// --- Manual loan payments (staff record what a member paid at the office) ---

// No referenceNo: the reference is the generated payment number, so the field is
// not accepted from the client at all. The ₱200 floor is enforced in the service
// rather than here, because it relaxes for a loan with less than that left.
const paymentSchema = z.object({
  scheduleId: z.number().int().positive(),
  amount: z.number().positive("Enter the amount the member paid"),
  paymentDate: z.string().optional().nullable(),
  remarks: z.string().max(500).optional().nullable(),
});

export async function recordLoanPayment(req, res, next) {
  try {
    const body = paymentSchema.parse(req.body);
    res.status(201).json(await loans.recordPayment(Number(req.params.id), body, req.user.id));
  } catch (err) {
    next(err);
  }
}

const voidSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
});

export async function voidLoanPayment(req, res, next) {
  try {
    const { reason } = voidSchema.parse(req.body ?? {});
    res.json(await loans.voidPayment(Number(req.params.paymentId), req.user.id, reason));
  } catch (err) {
    next(err);
  }
}

// A member's loan payments in one call, for the receipts list. Staff may ask for
// any member; a member is forced to their own; nobody else gets in.
export async function listLoanPayments(req, res, next) {
  try {
    const scope = memberScopeFor(req.user);
    res.json(await loans.listPayments({ memberId: scope ?? req.query.memberId }));
  } catch (err) {
    next(err);
  }
}

// Re-printing an acknowledgment slip, and the member's own view of it.
export async function getLoanPayment(req, res, next) {
  try {
    const payment = await loans.getPaymentById(Number(req.params.paymentId));
    assertMemberAccess(req.user, payment.loan.memberId, "loan payments");
    res.json(payment);
  } catch (err) {
    next(err);
  }
}

export async function getCreditScore(req, res, next) {
  try {
    const memberId = Number(req.params.memberId);
    assertMemberAccess(req.user, memberId, "credit score");
    const latest = await credit.currentForMember(memberId);
    const history = await credit.historyForMember(memberId);
    res.json({ latest, history });
  } catch (err) {
    next(err);
  }
}

// --- Computation explanations (formula + substituted values + result) ---

export async function explainLoan(req, res, next) {
  try {
    const id = Number(req.params.id);
    const loan = await loans.getById(id); // also enforces existence
    assertMemberAccess(req.user, loan.memberId, "loan computation");
    res.json(await loans.explainSchedule(id));
  } catch (err) {
    next(err);
  }
}

export async function explainCreditScore(req, res, next) {
  try {
    const memberId = Number(req.params.memberId);
    assertMemberAccess(req.user, memberId, "credit computation");
    const result = await credit.explain(memberId);
    if (!result) throw notFound("No credit score computed yet");
    res.json(result);
  } catch (err) {
    next(err);
  }
}

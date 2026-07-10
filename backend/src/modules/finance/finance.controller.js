import { z } from "zod";
import * as loans from "./loans.service.js";
import * as settlements from "./settlements.service.js";
import * as credit from "./credit.service.js";
import { forbidden, badRequest, notFound } from "../../utils/httpError.js";

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
    if (req.user.role === "MEMBER") {
      return res.json(await loans.list({ memberId: req.user.memberId }));
    }
    res.json(await loans.list(req.query));
  } catch (err) {
    next(err);
  }
}

export async function getLoan(req, res, next) {
  try {
    const loan = await loans.getById(Number(req.params.id));
    if (req.user.role === "MEMBER" && loan.memberId !== req.user.memberId) {
      throw forbidden("You can only view your own loans");
    }
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

// --- Settlements ---

const computeSchema = z.object({
  fiscalYear: z.number().int().min(2000).max(2100),
  dividendPool: z.number().nonnegative(),
  patronagePool: z.number().nonnegative(),
});

export async function listSettlements(req, res, next) {
  try {
    if (req.user.role === "MEMBER") {
      return res.json(await settlements.listForMember(req.user.memberId));
    }
    if (!req.query.fiscalYear) throw badRequest("fiscalYear query param is required");
    res.json(await settlements.listByYear(req.query.fiscalYear));
  } catch (err) {
    next(err);
  }
}

export async function computeSettlements(req, res, next) {
  try {
    if (!isStaff(req.user)) throw forbidden("Only staff can compute settlements");
    res.status(201).json(await settlements.computeForYear(computeSchema.parse(req.body), req.user.id));
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

export async function computeAllCreditScores(req, res, next) {
  try {
    res.json(await credit.evaluateAll(req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function getCreditScore(req, res, next) {
  try {
    const memberId = Number(req.params.memberId);
    if (req.user.role === "MEMBER" && req.user.memberId !== memberId) {
      throw forbidden("You can only view your own credit score");
    }
    const latest = await credit.latestForMember(memberId);
    const history = await credit.historyForMember(memberId);
    res.json({ latest, history });
  } catch (err) {
    next(err);
  }
}

export async function computeCreditScore(req, res, next) {
  try {
    if (!isStaff(req.user)) throw forbidden("Only staff can compute credit scores");
    const result = await credit.evaluateAndSave(Number(req.params.memberId), req.user.id);
    if (!result) throw notFound("Member not found");
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// --- Computation explanations (formula + substituted values + result) ---

export async function explainLoan(req, res, next) {
  try {
    const id = Number(req.params.id);
    const loan = await loans.getById(id); // also enforces existence
    if (req.user.role === "MEMBER" && loan.memberId !== req.user.memberId) {
      throw forbidden("You can only view your own loan computation");
    }
    res.json(await loans.explainSchedule(id));
  } catch (err) {
    next(err);
  }
}

export async function explainSettlement(req, res, next) {
  try {
    const memberId =
      req.user.role === "MEMBER" ? req.user.memberId : Number(req.query.memberId);
    if (!memberId) throw badRequest("memberId is required");
    if (!req.query.fiscalYear) throw badRequest("fiscalYear is required");
    const result = await settlements.explain(memberId, req.query.fiscalYear);
    if (!result) throw notFound("No settlement found for that member/year");
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function explainCreditScore(req, res, next) {
  try {
    const memberId = Number(req.params.memberId);
    if (req.user.role === "MEMBER" && req.user.memberId !== memberId) {
      throw forbidden("You can only view your own credit computation");
    }
    const result = await credit.explain(memberId);
    if (!result) throw notFound("No credit score computed yet");
    res.json(result);
  } catch (err) {
    next(err);
  }
}

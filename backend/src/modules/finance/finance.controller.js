import { z } from "zod";
import * as loans from "./loans.service.js";
import * as credit from "./credit.service.js";
import { forbidden, notFound, badRequest } from "../../utils/httpError.js";

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
    if (result.insufficientActivity) {
      throw badRequest(
        "Not enough activity to assess yet — this member has no deliveries or loans on record."
      );
    }
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

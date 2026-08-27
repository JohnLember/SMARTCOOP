import { Router } from "express";
import * as controller from "./finance.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();
const staff = requireRole("ADMIN", "STAFF");
router.use(authenticate);

// Loans — staff write; members read their own (scoped in controller).
router.get("/loans", controller.listLoans);
router.post("/loans", controller.createLoan);
router.get("/loans/:id/explain", controller.explainLoan);
router.post("/loans/:id/payments", staff, controller.recordLoanPayment);
router.get("/loans/:id", controller.getLoan);

// Manual loan payments. Recording and voiding move money on the schedule, so
// they are staff-only; reading one is scoped by assertMemberAccess so a member
// can re-print their own acknowledgment slip.
router.post("/loan-payments/:paymentId/void", staff, controller.voidLoanPayment);
router.get("/loan-payments", controller.listLoanPayments);
router.get("/loan-payments/:paymentId", controller.getLoanPayment);

// Agricultural Credit Scoring — read-only. Scoring is automatic: the events that
// change a score recompute it, and a read refreshes anything stale, so there is
// no compute endpoint to call and no button to press.
// Specific routes before the parameterized ones.
router.get("/credit-scores", staff, controller.listCreditScores);
router.get("/credit-scores/:memberId/explain", controller.explainCreditScore);
router.get("/credit-scores/:memberId", controller.getCreditScore);

export default router;

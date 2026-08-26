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

// Agricultural Credit Scoring — staff compute/list; members read their own.
// Specific routes before the parameterized ones.
router.get("/credit-scores", staff, controller.listCreditScores);
router.post("/credit-scores/compute-all", staff, controller.computeAllCreditScores);
router.get("/credit-scores/:memberId/explain", controller.explainCreditScore);
router.get("/credit-scores/:memberId", controller.getCreditScore);
router.post("/credit-scores/:memberId/compute", staff, controller.computeCreditScore);

export default router;

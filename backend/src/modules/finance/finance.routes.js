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
router.get("/loans/:id", controller.getLoan);

// Settlements — staff compute/list by year; members read their own.
router.get("/settlements", controller.listSettlements);
router.get("/settlements/explain", controller.explainSettlement);
router.post("/settlements/compute", controller.computeSettlements);

// Agricultural Credit Scoring — staff compute/list; members read their own.
// Specific routes before the parameterized ones.
router.get("/credit-scores", staff, controller.listCreditScores);
router.post("/credit-scores/compute-all", staff, controller.computeAllCreditScores);
router.get("/credit-scores/:memberId/explain", controller.explainCreditScore);
router.get("/credit-scores/:memberId", controller.getCreditScore);
router.post("/credit-scores/:memberId/compute", staff, controller.computeCreditScore);

export default router;

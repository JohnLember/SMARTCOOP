import { Router } from "express";
import * as controller from "./production.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();
const staff = requireRole("ADMIN", "STAFF");

router.use(authenticate);

// --- Loading batches (staff only) ---
router.get("/batches", staff, controller.listBatches);
router.post("/batches", staff, controller.createBatch);
router.get("/batches/:id", staff, controller.getBatch);
router.patch("/batches/:id/status", staff, controller.setBatchStatus);

// --- Deliveries (staff record; members read their own) ---
router.get("/deliveries", controller.listDeliveries);
router.get("/deduction-defaults", staff, controller.deductionDefaults);
router.post("/deliveries", staff, controller.createDelivery);
router.get("/deliveries/:id/explain", controller.explainDelivery);
router.get("/deliveries/:id", controller.getDelivery);

// --- Receipts (members see own; staff see all) ---
router.get("/receipts", controller.listReceipts);
router.get("/receipts/:id", controller.getReceipt);

export default router;

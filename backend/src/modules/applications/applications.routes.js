import { Router } from "express";
import * as controller from "./applications.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { publicWriteLimiter } from "../../middleware/rateLimit.js";

const router = Router();

// --- Public (no auth): prospective members apply ---
// Public and unauthenticated, so it is the natural spam target.
router.post("/", publicWriteLimiter, controller.create);
router.get("/barangays", controller.barangays);

// --- Staff only: review applications ---
router.use(authenticate, requireRole("ADMIN", "STAFF"));
router.get("/", controller.list);
router.get("/:id", controller.getById);
router.post("/:id/approve", controller.approve);
router.post("/:id/reject", controller.reject);
router.post("/:id/reconsider", controller.reconsider);
router.post("/:id/unapprove", controller.unapprove);

export default router;

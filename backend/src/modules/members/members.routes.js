import { Router } from "express";
import * as controller from "./members.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();
const staff = requireRole("ADMIN", "STAFF");

router.use(authenticate);

// Read: members can read their own record (checked in controller); list is staff-only.
router.get("/", staff, controller.list);

// Progression actions (staff only) — declared before "/:id" routes.
router.post("/evaluate-all", staff, controller.evaluateAll);

router.get("/:id", controller.getById);
router.get("/:id/progression/explain", controller.explainProgression);
router.post("/", staff, controller.create);
router.put("/:id", staff, controller.update);
// Self-service: a member may edit a limited set of fields on their own record
// (checked in the controller). Not staff-gated — that's what makes it "self".
router.put("/:id/profile", controller.updateProfile);
router.patch("/:id/status", staff, controller.setStatus);
router.post("/:id/account", staff, controller.createAccount);
router.post("/:id/evaluate", staff, controller.evaluate);

export default router;

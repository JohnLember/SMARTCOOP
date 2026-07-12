import { Router } from "express";
import * as controller from "./barangays.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();
router.use(authenticate);

// All authenticated roles can read barangays (used in dropdowns / MAO views).
router.get("/", controller.list);
router.put("/:id", requireRole("ADMIN", "STAFF"), controller.update);

export default router;

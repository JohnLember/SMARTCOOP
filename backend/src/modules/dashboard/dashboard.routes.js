import { Router } from "express";
import * as controller from "./dashboard.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();
router.use(authenticate, requireRole("ADMIN", "STAFF"));

router.get("/stats", controller.stats);

export default router;

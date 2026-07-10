import { Router } from "express";
import * as controller from "./notifications.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();
router.use(authenticate);

router.get("/", controller.list);
router.patch("/:id/read", controller.markRead);
// Staff and MAO can broadcast announcements.
router.post("/", requireRole("ADMIN", "STAFF", "MAO"), controller.create);

export default router;

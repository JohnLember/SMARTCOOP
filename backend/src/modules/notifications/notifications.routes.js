import { Router } from "express";
import * as controller from "./notifications.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();
router.use(authenticate);

router.get("/", controller.list);
// Every role has a notification list, so every role can clear it. Specific route
// before the parameterized one.
router.patch("/read-all", controller.markAllRead);
router.patch("/:id/read", controller.markRead);
router.post("/delete", controller.remove);
// Staff and MAO can broadcast announcements.
router.post("/", requireRole("ADMIN", "STAFF", "MAO"), controller.create);

export default router;

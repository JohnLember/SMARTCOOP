import { Router } from "express";
import * as controller from "./users.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();
const admin = requireRole("ADMIN");

// User management is ADMIN-only.
router.use(authenticate, admin);

router.get("/", controller.list);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.patch("/:id/password", controller.resetPassword);
router.delete("/:id", controller.remove);

export default router;

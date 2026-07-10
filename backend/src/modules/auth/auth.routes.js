import { Router } from "express";
import * as controller from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();

router.post("/login", controller.login);
router.post("/register", authenticate, requireRole("ADMIN"), controller.register);
router.get("/me", authenticate, controller.me);

export default router;

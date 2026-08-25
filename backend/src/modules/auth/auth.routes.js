import { Router } from "express";
import * as controller from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { loginLimiter } from "../../middleware/rateLimit.js";

const router = Router();

// Throttled: unlimited password guessing was possible here.
router.post("/login", loginLimiter, controller.login);
router.post("/register", authenticate, requireRole("ADMIN"), controller.register);
router.get("/me", authenticate, controller.me);

export default router;

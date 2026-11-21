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
// Office accounts only: a member's name lives on their Member record.
const office = requireRole("ADMIN", "STAFF", "MAO");
router.patch("/me", authenticate, office, controller.updateMe);
// Staff and MAO passwords are set by an admin on the Users page, never by themselves.
router.patch("/me/password", authenticate, requireRole("ADMIN"), controller.changePassword);

export default router;

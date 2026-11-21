import { z } from "zod";
import * as authService from "./auth.service.js";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(10, "Password must be at least 10 characters"),
  role: z.enum(["ADMIN", "STAFF", "MEMBER", "MAO"]),
  memberId: z.number().int().positive().optional(),
});

// Username, role and status are deliberately absent: only an admin changes those.
const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  middleName: z.string().trim().max(100).transform((v) => v || null).nullable().optional(),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(10, "Password must be at least 10 characters"),
});

export async function updateMe(req, res, next) {
  try {
    res.json(await authService.updateProfile(req.user.id, profileSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = passwordSchema.parse(req.body);
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const result = await authService.login(username, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const user = await authService.register(data, req.user.id);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

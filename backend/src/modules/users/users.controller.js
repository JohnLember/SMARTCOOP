import { z } from "zod";
import * as service from "./users.service.js";
import { badRequest } from "../../utils/httpError.js";

const createSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(10, "Password must be at least 10 characters"),
  role: z.enum(["ADMIN", "STAFF", "MEMBER", "MAO"]),
  memberId: z.number().int().positive().optional(),
});

const updateSchema = z.object({
  role: z.enum(["ADMIN", "STAFF", "MEMBER", "MAO"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const passwordSchema = z.object({
  password: z.string().min(10, "Password must be at least 10 characters"),
});

export async function list(req, res, next) {
  try {
    res.json(await service.list(req.query));
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    res.json(await service.getById(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    res.status(201).json(await service.create(data, req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const data = updateSchema.parse(req.body);
    // You cannot change your own role or status (prevents self-lockout).
    if (id === req.user.id && (data.role !== undefined || data.status !== undefined)) {
      throw badRequest("You cannot change your own role or status");
    }
    res.json(await service.update(id, data, req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { password } = passwordSchema.parse(req.body);
    res.json(await service.resetPassword(Number(req.params.id), password, req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    res.json(await service.remove(Number(req.params.id), req.user.id));
  } catch (err) {
    next(err);
  }
}

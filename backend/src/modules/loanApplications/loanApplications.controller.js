import { z } from "zod";
import * as service from "./loanApplications.service.js";
import { forbidden } from "../../utils/httpError.js";

const isStaff = (u) => u.role === "ADMIN" || u.role === "STAFF";

const createSchema = z.object({
  principalAmount: z.number().positive(),
  termMonths: z.number().int().min(1).max(120),
  purpose: z.string().trim().optional().nullable(),
});

const approveSchema = z.object({
  principalAmount: z.number().positive().optional(),
  interestRate: z.number().min(0).max(100).optional(),
  termMonths: z.number().int().min(1).max(120).optional(),
});

const rejectSchema = z.object({ note: z.string().optional() });

export async function create(req, res, next) {
  try {
    if (req.user.role !== "MEMBER" || !req.user.memberId) {
      throw forbidden("Only members can apply for a loan");
    }
    const data = createSchema.parse(req.body);
    res.status(201).json(await service.create(req.user.memberId, data));
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    if (req.user.role === "MEMBER") {
      return res.json(await service.listForMember(req.user.memberId));
    }
    res.json(await service.list(req.query));
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const app = await service.getById(Number(req.params.id));
    if (req.user.role === "MEMBER" && app.memberId !== req.user.memberId) {
      throw forbidden("You can only view your own loan application");
    }
    res.json(app);
  } catch (err) {
    next(err);
  }
}

export async function approve(req, res, next) {
  try {
    if (!isStaff(req.user)) throw forbidden("Only staff can approve loan applications");
    const data = approveSchema.parse(req.body ?? {});
    res.status(201).json(await service.approve(Number(req.params.id), data, req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function reject(req, res, next) {
  try {
    if (!isStaff(req.user)) throw forbidden("Only staff can reject loan applications");
    const { note } = rejectSchema.parse(req.body ?? {});
    res.json(await service.reject(Number(req.params.id), note, req.user.id));
  } catch (err) {
    next(err);
  }
}

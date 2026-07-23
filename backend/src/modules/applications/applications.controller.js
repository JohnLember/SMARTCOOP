import { z } from "zod";
import * as service from "./applications.service.js";

const applicationSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  middleName: z.string().trim().optional().nullable(),
  lastName: z.string().trim().min(1, "Last name is required"),
  sex: z.string().trim().optional().nullable(),
  birthdate: z.string().trim().min(1, "Birthdate is required"),
  address: z.string().trim().min(1, "Address is required"),
  barangayId: z.number({ message: "Barangay is required" }).int().positive("Barangay is required"),
  contactNo: z.string().trim().min(1, "Contact number is required"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")).nullable(),
  reason: z.string().trim().optional().nullable(),
});

const approveSchema = z.object({
  memberNo: z.string().optional(),
});

const rejectSchema = z.object({ note: z.string().optional() });

export async function create(req, res, next) {
  try {
    const data = applicationSchema.parse(req.body);
    res.status(201).json(await service.create(data));
  } catch (err) {
    next(err);
  }
}

export async function barangays(_req, res, next) {
  try {
    res.json(await service.publicBarangays());
  } catch (err) {
    next(err);
  }
}

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

export async function approve(req, res, next) {
  try {
    const data = approveSchema.parse(req.body ?? {});
    res.status(201).json(await service.approve(Number(req.params.id), data, req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function reject(req, res, next) {
  try {
    const { note } = rejectSchema.parse(req.body ?? {});
    res.json(await service.reject(Number(req.params.id), note, req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function reconsider(req, res, next) {
  try {
    res.json(await service.reconsider(Number(req.params.id), req.user.id));
  } catch (err) {
    next(err);
  }
}

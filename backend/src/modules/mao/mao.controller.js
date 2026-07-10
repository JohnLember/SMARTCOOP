import { z } from "zod";
import * as service from "./mao.service.js";

const tagSchema = z.object({
  barangayId: z.number().int().positive(),
  reason: z.string().min(1),
  severity: z.enum(["LOW", "MODERATE", "HIGH", "CRITICAL"]).optional(),
  note: z.string().optional().nullable(),
});

const programSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional().nullable(),
  targetBarangayId: z.number().int().positive().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.enum(["PLANNED", "ONGOING", "COMPLETED", "CANCELLED"]).optional(),
  budget: z.number().nonnegative().optional().nullable(),
});

const recipientSchema = z.object({
  memberId: z.number().int().positive(),
  quantityOrAmount: z.number().nonnegative().optional().nullable(),
  dateDistributed: z.string().optional().nullable(),
});

export async function stats(_req, res, next) {
  try {
    res.json(await service.productionStats());
  } catch (err) {
    next(err);
  }
}

export async function membersLookup(_req, res, next) {
  try {
    res.json(await service.membersLookup());
  } catch (err) {
    next(err);
  }
}

export async function listTags(_req, res, next) {
  try {
    res.json(await service.listTags());
  } catch (err) {
    next(err);
  }
}

export async function createTag(req, res, next) {
  try {
    res.status(201).json(await service.createTag(tagSchema.parse(req.body), req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function resolveTag(req, res, next) {
  try {
    res.json(await service.resolveTag(Number(req.params.id), req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function listPrograms(_req, res, next) {
  try {
    res.json(await service.listPrograms());
  } catch (err) {
    next(err);
  }
}

export async function getProgram(req, res, next) {
  try {
    res.json(await service.getProgram(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function createProgram(req, res, next) {
  try {
    res.status(201).json(await service.createProgram(programSchema.parse(req.body), req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function updateProgram(req, res, next) {
  try {
    res.json(await service.updateProgram(Number(req.params.id), programSchema.partial().parse(req.body), req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function addRecipient(req, res, next) {
  try {
    res.status(201).json(await service.addRecipient(Number(req.params.id), recipientSchema.parse(req.body), req.user.id));
  } catch (err) {
    next(err);
  }
}

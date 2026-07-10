import { z } from "zod";
import * as service from "./barangays.service.js";

const schema = z.object({
  name: z.string().min(1),
  code: z.string().optional().nullable(),
});

export async function list(_req, res, next) {
  try {
    res.json(await service.list());
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    res.status(201).json(await service.create(schema.parse(req.body), req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    res.json(await service.update(Number(req.params.id), schema.partial().parse(req.body), req.user.id));
  } catch (err) {
    next(err);
  }
}

import { z } from "zod";
import * as service from "./notifications.service.js";
import { logActivity } from "../../utils/activityLog.js";

const createSchema = z
  .object({
    title: z.string().min(1),
    message: z.string().min(1),
    recipientRole: z.enum(["ADMIN", "STAFF", "MEMBER", "MAO"]).optional(),
    recipientMemberId: z.number().int().positive().optional(),
  })
  .refine((d) => d.recipientRole || d.recipientMemberId, {
    message: "Provide either recipientRole or recipientMemberId",
  });

export async function list(req, res, next) {
  try {
    res.json(await service.listForUser(req.user));
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const notif = await service.create(data, req.user.id);
    await logActivity(req.user.id, `Sent announcement "${data.title}"`);
    res.status(201).json(notif);
  } catch (err) {
    next(err);
  }
}

// One endpoint for both single and bulk delete — the row-level button just
// sends a list of one.
const deleteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, "Select at least one notification"),
});

export async function remove(req, res, next) {
  try {
    const { ids } = deleteSchema.parse(req.body ?? {});
    res.json(await service.removeMany(ids, req.user));
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req, res, next) {
  try {
    res.json(await service.markAllRead(req.user));
  } catch (err) {
    next(err);
  }
}

export async function markRead(req, res, next) {
  try {
    res.json(await service.markRead(Number(req.params.id), req.user));
  } catch (err) {
    next(err);
  }
}

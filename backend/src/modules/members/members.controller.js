import { z } from "zod";
import * as service from "./members.service.js";
import * as progression from "../progression/progression.service.js";
import { forbidden } from "../../utils/httpError.js";
import { assertMemberAccess } from "../../utils/access.js";

// Profile photos arrive as base64 data URLs (there is no file storage). The
// field used to accept any string of any length, so it could be filled with
// arbitrary content — including a data: URL of a scriptable type — and used as
// unbounded storage. Restrict it to real raster image types and a sane size.
const MAX_PHOTO_BYTES = 700 * 1024; // ~512KB of image after base64 overhead
const dataUrlImage = z
  .string()
  .regex(
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/,
    "Profile photo must be a PNG, JPEG or WebP image"
  )
  .max(MAX_PHOTO_BYTES, "Profile photo is too large")
  .optional()
  .nullable();

const memberSchema = z.object({
  memberNo: z.string().min(1),
  firstName: z.string().min(1),
  middleName: z.string().optional().nullable(),
  lastName: z.string().min(1),
  sex: z.string().optional().nullable(),
  birthdate: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  barangayId: z.number().int().positive().optional().nullable(),
  contactNo: z.string().optional().nullable(),
  profilePhoto: dataUrlImage,
  membershipType: z.enum(["REGULAR", "ASSOCIATE"]).optional(),
  dateJoined: z.string().optional().nullable(),
});

const accountSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(10, "Password must be at least 10 characters"),
});

// Fields a member may edit on their own profile — no membership type, share
// capital, member no., status, or date joined (those stay staff-controlled).
const profileSchema = z.object({
  sex: z.string().optional().nullable(),
  birthdate: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  barangayId: z.number().int().positive().optional().nullable(),
  contactNo: z.string().optional().nullable(),
  profilePhoto: dataUrlImage,
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
    const id = Number(req.params.id);
    // Staff may read any member; a member only their own; MAO uses /api/mao.
    assertMemberAccess(req.user, id, "record");
    res.json(await service.getById(id));
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const data = memberSchema.parse(req.body);
    res.status(201).json(await service.create(data, req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const data = memberSchema.partial().parse(req.body);
    res.json(await service.update(Number(req.params.id), data, req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (req.user.role !== "MEMBER" || req.user.memberId !== id) {
      throw forbidden("You can only edit your own profile");
    }
    const data = profileSchema.parse(req.body);
    res.json(await service.update(id, data, req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function setStatus(req, res, next) {
  try {
    const { status } = z
      .object({ status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]) })
      .parse(req.body);
    res.json(await service.setStatus(Number(req.params.id), status, req.user.id));
  } catch (err) {
    next(err);
  }
}

export async function createAccount(req, res, next) {
  try {
    const data = accountSchema.parse(req.body);
    res.status(201).json(await service.createAccount(Number(req.params.id), data, req.user.id));
  } catch (err) {
    next(err);
  }
}

// --- Progression / Priority Ranking ---

export async function evaluate(req, res, next) {
  try {
    const result = await progression.evaluateAndSave(Number(req.params.id));
    if (!result) throw forbidden("Member not found");
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function evaluateAll(_req, res, next) {
  try {
    res.json(await progression.evaluateAll());
  } catch (err) {
    next(err);
  }
}

// Step-by-step explanation of the member categorization computation.
export async function explainProgression(req, res, next) {
  try {
    const id = Number(req.params.id);
    assertMemberAccess(req.user, id, "computation");
    const result = await progression.explain(id);
    if (!result) throw forbidden("Member not found");
    res.json(result);
  } catch (err) {
    next(err);
  }
}

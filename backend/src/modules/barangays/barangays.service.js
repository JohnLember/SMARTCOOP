import prisma from "../../config/db.js";
import { notFound } from "../../utils/httpError.js";
import { logActivity } from "../../utils/activityLog.js";

export function list() {
  return prisma.barangay.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } } },
  });
}

export async function create(data, actorId) {
  const barangay = await prisma.barangay.create({ data });
  await logActivity(actorId, `Created barangay "${barangay.name}"`);
  return barangay;
}

export async function update(id, data, actorId) {
  const existing = await prisma.barangay.findUnique({ where: { id } });
  if (!existing) throw notFound("Barangay not found");
  const barangay = await prisma.barangay.update({ where: { id }, data });
  await logActivity(actorId, `Updated barangay "${barangay.name}"`);
  return barangay;
}

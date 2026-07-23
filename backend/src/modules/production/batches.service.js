import prisma from "../../config/db.js";
import { notFound, badRequest } from "../../utils/httpError.js";
import { logActivity } from "../../utils/activityLog.js";

export function list({ barangayId, status, periodType }) {
  const where = {};
  if (barangayId) where.barangayId = Number(barangayId);
  if (status) where.status = status;
  if (periodType) where.periodType = periodType;

  return prisma.loadingBatch.findMany({
    where,
    orderBy: { startDate: "desc" },
    include: {
      barangay: true,
      _count: { select: { deliveries: true } },
    },
  });
}

export async function getById(id) {
  const batch = await prisma.loadingBatch.findUnique({
    where: { id },
    include: {
      barangay: true,
      deliveries: {
        orderBy: { deliveryDate: "desc" },
        include: {
          member: { select: { id: true, memberNo: true, firstName: true, lastName: true } },
          receipt: true,
        },
      },
    },
  });
  if (!batch) throw notFound("Loading batch not found");

  // Convenience totals for the batch summary.
  const totals = batch.deliveries.reduce(
    (acc, d) => {
      acc.totalKg += Number(d.weightKg);
      acc.totalAmount += Number(d.totalAmount);
      return acc;
    },
    { totalKg: 0, totalAmount: 0 }
  );

  return { ...batch, totals };
}

export async function create(data, actorId) {
  if (new Date(data.endDate) < new Date(data.startDate)) {
    throw badRequest("End date cannot be before start date");
  }
  const batch = await prisma.loadingBatch.create({
    data: {
      barangayId: data.barangayId,
      periodType: data.periodType,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    },
    include: { barangay: true },
  });
  await logActivity(actorId, `Created ${batch.periodType} loading batch for ${batch.barangay.name}`);
  return batch;
}

// Deletes a settled batch and everything hanging off its deliveries. No FK
// cascade exists batch→delivery, so remove children first, inside one txn.
// ponytail: does NOT reverse loan-installment payments, share capital, or CBU
// that those deliveries applied — hard-delete only. Add reversal if settled
// batches ever need to be truly "undone" rather than purged.
export async function remove(id, actorId) {
  const batch = await prisma.loadingBatch.findUnique({
    where: { id },
    include: { barangay: true, deliveries: { select: { id: true } } },
  });
  if (!batch) throw notFound("Loading batch not found");
  if (batch.status !== "SETTLED") throw badRequest("Only settled batches can be deleted");

  const deliveryIds = batch.deliveries.map((d) => d.id);
  await prisma.$transaction([
    prisma.loanPayment.deleteMany({ where: { deliveryId: { in: deliveryIds } } }),
    prisma.receipt.deleteMany({ where: { deliveryId: { in: deliveryIds } } }),
    prisma.rubberDelivery.deleteMany({ where: { batchId: id } }),
    prisma.loadingBatch.delete({ where: { id } }),
  ]);
  await logActivity(actorId, `Deleted settled loading batch #${id} (${batch.barangay.name})`);
  return { id };
}

export async function setStatus(id, status, actorId) {
  const existing = await prisma.loadingBatch.findUnique({ where: { id } });
  if (!existing) throw notFound("Loading batch not found");
  const batch = await prisma.loadingBatch.update({
    where: { id },
    data: { status },
    include: { barangay: true },
  });
  await logActivity(actorId, `Set loading batch #${id} status to ${status}`);
  return batch;
}

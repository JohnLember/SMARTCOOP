import prisma from "../../config/db.js";
import { notFound } from "../../utils/httpError.js";

const receiptInclude = {
  delivery: { include: { batch: { include: { barangay: true } } } },
  member: {
    select: {
      memberNo: true,
      firstName: true,
      middleName: true,
      lastName: true,
      membershipType: true,
      barangay: { select: { name: true } },
    },
  },
};

// Receipts list, optionally scoped to a member (members see only their own).
export function list({ memberId }) {
  const where = {};
  if (memberId) where.memberId = Number(memberId);

  return prisma.receipt.findMany({
    where,
    orderBy: { dateIssued: "desc" },
    include: receiptInclude,
  });
}

// A single receipt with everything needed to render a printable document.
export async function getById(id) {
  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: receiptInclude,
  });
  if (!receipt) throw notFound("Receipt not found");
  return receipt;
}

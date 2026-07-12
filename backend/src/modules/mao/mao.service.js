import prisma from "../../config/db.js";
import { notFound } from "../../utils/httpError.js";
import { logActivity } from "../../utils/activityLog.js";

// Minimal member lookup for the support-program recipient picker (MAO has no
// access to the full members list; this exposes only non-sensitive fields).
export async function membersLookup() {
  const members = await prisma.member.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      memberNo: true,
      firstName: true,
      lastName: true,
      barangay: { select: { name: true } },
    },
    orderBy: { lastName: "asc" },
  });
  return members.map((m) => ({
    id: m.id,
    memberNo: m.memberNo,
    firstName: m.firstName,
    lastName: m.lastName,
    barangay: m.barangay?.name ?? null,
  }));
}

// Active members grouped by barangay, for the printable roster report.
// Same non-sensitive field set as membersLookup — no contact/financial data.
export async function membersByBarangay() {
  const barangays = await prisma.barangay.findMany({
    orderBy: { name: "asc" },
    include: {
      members: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          memberNo: true,
          firstName: true,
          lastName: true,
          membershipType: true,
          dateJoined: true,
        },
        orderBy: { lastName: "asc" },
      },
    },
  });
  return barangays.map((b) => ({ id: b.id, name: b.name, members: b.members }));
}

// ---------------------------------------------------------------------------
// Aggregated production analytics (read-only)
// Reads from rubber_deliveries. Returns zeros/empty until the Production module
// populates deliveries, but the shape is final so the dashboard works now.
// ---------------------------------------------------------------------------
export async function productionStats() {
  const [totals, byBarangay, deliveries, memberCount] = await Promise.all([
    prisma.rubberDelivery.aggregate({
      _sum: { weightKg: true, totalAmount: true },
      _count: true,
    }),
    // Production grouped by barangay (via member → barangay).
    prisma.$queryRaw`
      SELECT b.id AS barangayId, b.name AS barangay,
             COALESCE(SUM(d.weight_kg), 0) AS totalKg,
             COALESCE(SUM(d.total_amount), 0) AS totalAmount
      FROM barangays b
      LEFT JOIN members m ON m.barangay_id = b.id
      LEFT JOIN rubber_deliveries d ON d.member_id = m.id
      GROUP BY b.id, b.name
      ORDER BY totalKg DESC
    `,
    // Monthly trend (last 12 months).
    prisma.$queryRaw`
      SELECT DATE_FORMAT(delivery_date, '%Y-%m') AS month,
             COALESCE(SUM(weight_kg), 0) AS totalKg
      FROM rubber_deliveries
      WHERE delivery_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `,
    prisma.member.count({ where: { status: "ACTIVE" } }),
  ]);

  // BigInt/Decimal from raw queries → plain numbers for JSON.
  const num = (v) => (v == null ? 0 : Number(v));

  return {
    totalDeliveries: totals._count,
    totalVolumeKg: num(totals._sum.weightKg),
    totalValue: num(totals._sum.totalAmount),
    activeMembers: memberCount,
    byBarangay: byBarangay.map((r) => ({
      barangayId: num(r.barangayId),
      barangay: r.barangay,
      totalKg: num(r.totalKg),
      totalAmount: num(r.totalAmount),
    })),
    monthlyTrend: deliveries.map((r) => ({
      month: r.month,
      totalKg: num(r.totalKg),
    })),
  };
}

// --- Affected-area tagging ---

export function listTags() {
  return prisma.affectedAreaTag.findMany({
    orderBy: { dateTagged: "desc" },
    include: { barangay: true, taggedBy: { select: { username: true } } },
  });
}

export async function createTag(data, actorId) {
  const tag = await prisma.affectedAreaTag.create({
    data: { ...data, taggedByUserId: actorId },
    include: { barangay: true },
  });
  await logActivity(actorId, `Tagged affected area: ${tag.barangay.name} (${tag.reason})`);
  return tag;
}

export async function resolveTag(id, actorId) {
  const existing = await prisma.affectedAreaTag.findUnique({ where: { id } });
  if (!existing) throw notFound("Tag not found");
  const tag = await prisma.affectedAreaTag.update({
    where: { id },
    data: { resolvedAt: new Date() },
  });
  await logActivity(actorId, `Resolved affected-area tag #${id}`);
  return tag;
}

// --- Support programs ---

export function listPrograms() {
  return prisma.supportProgram.findMany({
    orderBy: { startDate: "desc" },
    include: {
      targetBarangay: true,
      _count: { select: { recipients: true } },
    },
  });
}

export async function getProgram(id) {
  const program = await prisma.supportProgram.findUnique({
    where: { id },
    include: {
      targetBarangay: true,
      recipients: { include: { member: { select: { memberNo: true, firstName: true, lastName: true } } } },
    },
  });
  if (!program) throw notFound("Support program not found");
  return program;
}

export async function createProgram(data, actorId) {
  const program = await prisma.supportProgram.create({
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });
  await logActivity(actorId, `Created support program "${program.name}"`);
  return program;
}

export async function updateProgram(id, data, actorId) {
  const existing = await prisma.supportProgram.findUnique({ where: { id } });
  if (!existing) throw notFound("Support program not found");
  const program = await prisma.supportProgram.update({
    where: { id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
  await logActivity(actorId, `Updated support program "${program.name}"`);
  return program;
}

export async function addRecipient(programId, data, actorId) {
  await getProgram(programId);
  const recipient = await prisma.supportProgramRecipient.create({
    data: {
      programId,
      memberId: data.memberId,
      quantityOrAmount: data.quantityOrAmount ?? null,
      dateDistributed: data.dateDistributed ? new Date(data.dateDistributed) : null,
    },
    include: { member: { select: { memberNo: true, firstName: true, lastName: true } } },
  });
  await logActivity(actorId, `Added recipient to support program #${programId}`);
  return recipient;
}

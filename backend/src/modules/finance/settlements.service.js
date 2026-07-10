import prisma from "../../config/db.js";
import { logActivity } from "../../utils/activityLog.js";

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const settlementInclude = {
  member: { select: { id: true, memberNo: true, firstName: true, lastName: true } },
};

export function listByYear(fiscalYear) {
  return prisma.settlement.findMany({
    where: { fiscalYear: Number(fiscalYear) },
    orderBy: { totalAmount: "desc" },
    include: settlementInclude,
  });
}

export function listForMember(memberId) {
  return prisma.settlement.findMany({
    where: { memberId: Number(memberId) },
    orderBy: { fiscalYear: "desc" },
  });
}

const fmt = (n) =>
  Number(Math.round(Number(n) * 100) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Step-by-step explanation of one member's settlement for a fiscal year.
export async function explain(memberId, fiscalYear) {
  const year = Number(fiscalYear);
  const settlement = await prisma.settlement.findFirst({
    where: { memberId: Number(memberId), fiscalYear: year },
  });
  if (!settlement) return null;

  const member = await prisma.member.findUnique({ where: { id: Number(memberId) } });
  const run = await prisma.appSetting.findUnique({ where: { key: `settlement:${year}` } });
  const params = run?.value ?? {};

  const periodStart = new Date(Date.UTC(year, 0, 1));
  const periodEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  const vol = await prisma.rubberDelivery.aggregate({
    where: { memberId: Number(memberId), deliveryDate: { gte: periodStart, lte: periodEnd } },
    _sum: { weightKg: true },
  });
  const memberVolume = Number(vol._sum.weightKg ?? 0);
  const shareCapital = Number(member.shareCapital);

  const steps = [
    {
      label: "Dividend (allocated by share capital)",
      formula: "dividendPool × (memberShareCapital ÷ totalShareCapital)",
      substitution: `₱${fmt(params.dividendPool ?? 0)} × (₱${fmt(shareCapital)} ÷ ₱${fmt(
        params.totalShareCapital ?? 0
      )})`,
      result: `₱${fmt(settlement.dividend)}`,
    },
    {
      label: "Patronage refund (allocated by delivery volume)",
      formula: "patronagePool × (memberVolumeKg ÷ totalVolumeKg)",
      substitution: `₱${fmt(params.patronagePool ?? 0)} × (${fmt(memberVolume)} kg ÷ ${fmt(
        params.totalVolumeKg ?? 0
      )} kg)`,
      result: `₱${fmt(settlement.patronageRefund)}`,
    },
    {
      label: "Total settlement",
      formula: "dividend + patronageRefund",
      substitution: `₱${fmt(settlement.dividend)} + ₱${fmt(settlement.patronageRefund)}`,
      result: `₱${fmt(settlement.totalAmount)}`,
    },
  ];

  return {
    title: `${year} Settlement`,
    description:
      "Dividends are shared pro-rata by each member's share capital; patronage refunds pro-rata by rubber delivery volume (kg) for the fiscal year.",
    steps,
    result: { label: "Total settlement", value: `₱${fmt(settlement.totalAmount)}` },
  };
}

// ---------------------------------------------------------------------------
// Two-pool allocation:
//   dividend_i  = dividendPool  x (shareCapital_i / Σ shareCapital)
//   patronage_i = patronagePool x (deliveryVolumeKg_i / Σ deliveryVolumeKg)
// Delivery volume is measured within the fiscal year (Jan 1 – Dec 31).
// Recomputing a year replaces that year's settlements (idempotent).
// ---------------------------------------------------------------------------
export async function computeForYear({ fiscalYear, dividendPool, patronagePool }, actorId) {
  const year = Number(fiscalYear);
  const periodStart = new Date(Date.UTC(year, 0, 1));
  const periodEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

  const members = await prisma.member.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, shareCapital: true },
  });

  // Delivery volume (kg) per member within the fiscal year.
  const volumes = await prisma.rubberDelivery.groupBy({
    by: ["memberId"],
    where: { deliveryDate: { gte: periodStart, lte: periodEnd } },
    _sum: { weightKg: true },
  });
  const volumeByMember = new Map(
    volumes.map((v) => [v.memberId, Number(v._sum.weightKg ?? 0)])
  );

  const totalShareCapital = members.reduce((s, m) => s + Number(m.shareCapital), 0);
  const totalVolume = members.reduce((s, m) => s + (volumeByMember.get(m.id) ?? 0), 0);

  const rows = members.map((m) => {
    const sc = Number(m.shareCapital);
    const vol = volumeByMember.get(m.id) ?? 0;
    const dividend =
      totalShareCapital > 0 ? round2((Number(dividendPool) * sc) / totalShareCapital) : 0;
    const patronageRefund =
      totalVolume > 0 ? round2((Number(patronagePool) * vol) / totalVolume) : 0;
    return {
      memberId: m.id,
      fiscalYear: year,
      periodStart,
      periodEnd,
      dividend,
      patronageRefund,
      totalAmount: round2(dividend + patronageRefund),
      datePaid: new Date(),
    };
  });

  await prisma.$transaction([
    prisma.settlement.deleteMany({ where: { fiscalYear: year } }),
    prisma.settlement.createMany({ data: rows }),
    // Persist the run parameters so the computation can be explained later.
    prisma.appSetting.upsert({
      where: { key: `settlement:${year}` },
      update: {
        value: {
          dividendPool: Number(dividendPool),
          patronagePool: Number(patronagePool),
          totalShareCapital,
          totalVolumeKg: totalVolume,
        },
      },
      create: {
        key: `settlement:${year}`,
        value: {
          dividendPool: Number(dividendPool),
          patronagePool: Number(patronagePool),
          totalShareCapital,
          totalVolumeKg: totalVolume,
        },
      },
    }),
  ]);

  await logActivity(
    actorId,
    `Computed ${year} settlements: dividend pool ₱${dividendPool}, patronage pool ₱${patronagePool} across ${rows.length} members`
  );

  return {
    fiscalYear: year,
    members: rows.length,
    totalShareCapital,
    totalVolumeKg: totalVolume,
    totalDividend: round2(rows.reduce((s, r) => s + r.dividend, 0)),
    totalPatronage: round2(rows.reduce((s, r) => s + r.patronageRefund, 0)),
  };
}

import prisma from "../../config/db.js";
import { notFound } from "../../utils/httpError.js";
import { logActivity } from "../../utils/activityLog.js";

// ---------------------------------------------------------------------------
// Agricultural Credit Scoring System
// ---------------------------------------------------------------------------
// A standardized, algorithmic creditworthiness assessment (Objective 3 /
// Problem 6). Score 0-100 from three weighted pillars, each normalized 0-100:
//
//   1. Repayment history       — loan installments paid on time, overdue, and
//                                loans fully repaid (historical financial interactions)
//   2. Production consistency  — delivery volume + how regularly the member
//                                delivers over the last 12 months
//   3. Cooperative standing    — membership tenure and class
//                                (standing within the cooperative)
//
// The score maps to a risk band + lending recommendation + a suggested credit
// limit. Weights/caps are tunable via app_settings key "creditScoring".
// ---------------------------------------------------------------------------

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const DEFAULT_CONFIG = {
  weights: { repayment: 0.35, production: 0.3, farm: 0.35 },
  caps: { volumeKg: 5000, consistencyMonths: 12, tenureMonths: 60 },
  bands: { low: 75, medium: 50 }, // >=low LOW risk; >=medium MEDIUM; else HIGH
  // Suggested credit limit = annualDeliveryValue * deliveryMult * score%
  limit: { deliveryMult: 0.5 },
};

export async function getConfig() {
  const setting = await prisma.appSetting.findUnique({ where: { key: "creditScoring" } });
  const v = setting?.value;
  if (!v) return DEFAULT_CONFIG;
  return {
    weights: { ...DEFAULT_CONFIG.weights, ...(v.weights ?? {}) },
    caps: { ...DEFAULT_CONFIG.caps, ...(v.caps ?? {}) },
    bands: { ...DEFAULT_CONFIG.bands, ...(v.bands ?? {}) },
    limit: { ...DEFAULT_CONFIG.limit, ...(v.limit ?? {}) },
  };
}

const norm = (value, cap) => (cap > 0 ? Math.min(100, (Number(value) / cap) * 100) : 0);

function monthsBetween(from, to = new Date()) {
  if (!from) return 0;
  return Math.max(0, (to.getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

function bandFor(score, bands) {
  if (score >= bands.low) return "LOW";
  if (score >= bands.medium) return "MEDIUM";
  return "HIGH";
}

const RECOMMENDATION = {
  LOW: "Approve — low risk",
  MEDIUM: "Review — standard terms / partial guarantee",
  HIGH: "High risk — require collateral or decline",
};

// Pure scoring function over already-gathered data.
export function scoreMember({ member, loans, deliveries }, config = DEFAULT_CONFIG) {
  const now = new Date();

  // --- 1. Repayment history ---
  let dueCount = 0;
  let paidDue = 0;
  let overdue = 0;
  let outstanding = 0;
  let fullyRepaidLoans = 0;

  for (const loan of loans) {
    if (loan.status === "ACTIVE") outstanding += Number(loan.remainingBalance);
    const allPaid = loan.schedule.length > 0 && loan.schedule.every((r) => r.status === "PAID");
    if (loan.status === "INACTIVE" && allPaid) fullyRepaidLoans += 1;
    for (const row of loan.schedule) {
      if (new Date(row.dueDate) <= now) {
        dueCount += 1;
        if (row.status === "PAID") paidDue += 1;
        else overdue += 1;
      }
    }
  }
  const onTimeRatio = dueCount > 0 ? paidDue / dueCount : null;
  let repaymentScore;
  if (loans.length === 0) {
    repaymentScore = 65; // no history — neutral, slightly cautious
  } else if (dueCount === 0) {
    repaymentScore = 72; // has a loan but nothing due yet
  } else {
    repaymentScore = round2(onTimeRatio * 100);
  }
  repaymentScore = Math.min(100, repaymentScore + fullyRepaidLoans * 5); // reward clean closures

  // --- 2. Production consistency (last 12 months) ---
  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  const recent = deliveries.filter((d) => new Date(d.deliveryDate) >= since);
  const totalVolume = recent.reduce((s, d) => s + Number(d.weightKg), 0);
  const annualDeliveryValue = recent.reduce((s, d) => s + Number(d.totalAmount), 0);
  const activeMonths = new Set(
    recent.map((d) => new Date(d.deliveryDate).toISOString().slice(0, 7))
  ).size;
  const normVolume = norm(totalVolume, config.caps.volumeKg);
  const normConsistency = norm(activeMonths, config.caps.consistencyMonths);
  const productionScore = round2(0.6 * normVolume + 0.4 * normConsistency);

  // --- 3. Cooperative standing (membership tenure + class) ---
  const tenureMonths = monthsBetween(member.dateJoined);
  const normTenure = norm(tenureMonths, config.caps.tenureMonths);
  const classPoints = member.membershipType === "REGULAR" ? 100 : 60;
  const farmScore = round2(0.5 * normTenure + 0.5 * classPoints);

  // --- Composite ---
  // Pillar 1 only means something with actual loan history. With none, its
  // weight is redistributed proportionally across Pillars 2 & 3 rather than
  // seeded with a flat baseline — otherwise every member who has never borrowed
  // carries the same padded repayment score.
  const hasLoanHistory = loans.length > 0;
  let wRepay = config.weights.repayment;
  let wProd = config.weights.production;
  let wFarm = config.weights.farm;
  if (!hasLoanHistory) {
    const denom = wProd + wFarm;
    wProd = denom > 0 ? wProd / denom : 0;
    wFarm = denom > 0 ? wFarm / denom : 0;
    wRepay = 0;
  }
  const score = round2(wRepay * repaymentScore + wProd * productionScore + wFarm * farmScore);
  const riskBand = bandFor(score, config.bands);

  const capacity = annualDeliveryValue * config.limit.deliveryMult;
  const suggestedCreditLimit = Math.round((capacity * score) / 100 / 100) * 100;

  return {
    score,
    riskBand,
    recommendation: RECOMMENDATION[riskBand],
    suggestedCreditLimit,
    factors: {
      repaymentScore: hasLoanHistory ? repaymentScore : null,
      hasLoanHistory,
      productionScore,
      farmScore,
      onTimeRatio: onTimeRatio != null ? round2(onTimeRatio) : null,
      dueInstallments: dueCount,
      paidOnTime: paidDue,
      overdueInstallments: overdue,
      fullyRepaidLoans,
      outstandingBalance: round2(outstanding),
      totalVolumeKg: round2(totalVolume),
      activeMonths,
      annualDeliveryValue: round2(annualDeliveryValue),
      tenureMonths: round2(tenureMonths),
      membershipType: member.membershipType,
    },
  };
}

async function gather(memberId) {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) return null;
  const loans = await prisma.loan.findMany({
    where: { memberId },
    include: { schedule: true },
  });
  const deliveries = await prisma.rubberDelivery.findMany({
    where: { memberId },
    select: { weightKg: true, totalAmount: true, deliveryDate: true },
  });
  return { member, loans, deliveries };
}

// Computes and persists a credit score (keeps a history row per computation).
export async function evaluateAndSave(memberId, actorId) {
  const data = await gather(memberId);
  if (!data) return null;
  // No deliveries and no loans → no track record worth scoring. Skip so a
  // brand-new member never shows a score built only on cooperative standing.
  if (data.deliveries.length === 0 && data.loans.length === 0) {
    return { memberId, insufficientActivity: true };
  }
  const config = await getConfig();
  const result = scoreMember(data, config);

  const saved = await prisma.creditScore.create({
    data: {
      memberId,
      score: result.score,
      factors: {
        ...result.factors,
        riskBand: result.riskBand,
        recommendation: result.recommendation,
        suggestedCreditLimit: result.suggestedCreditLimit,
      },
    },
  });

  if (actorId) {
    await logActivity(
      actorId,
      `Computed credit score for ${data.member.memberNo}: ${result.score} (${result.riskBand} risk)`
    );
  }
  return { memberId, ...result, computedAt: saved.computedAt };
}

export async function evaluateAll(actorId) {
  const members = await prisma.member.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  const bands = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  let scored = 0;
  for (const m of members) {
    const res = await evaluateAndSave(m.id, actorId);
    if (res?.riskBand) {
      bands[res.riskBand] += 1;
      scored += 1;
    }
  }
  return { evaluated: scored, skipped: members.length - scored, ...bands };
}

export async function latestForMember(memberId) {
  return prisma.creditScore.findFirst({
    where: { memberId },
    orderBy: { computedAt: "desc" },
  });
}

export async function historyForMember(memberId) {
  return prisma.creditScore.findMany({
    where: { memberId },
    orderBy: { computedAt: "desc" },
    take: 20,
  });
}

const fmt = (n) =>
  Number(Math.round(Number(n) * 100) / 100).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

// Step-by-step explanation of a member's latest credit score.
export async function explain(memberId) {
  const latest = await latestForMember(memberId);
  if (!latest) return null;
  const f = latest.factors;
  const config = await getConfig();
  const w = config.weights;
  const caps = config.caps;

  const normVolume = norm(f.totalVolumeKg, caps.volumeKg);
  const normConsistency = norm(f.activeMonths, caps.consistencyMonths);
  const normTenure = norm(f.tenureMonths, caps.tenureMonths);
  const classPoints = f.membershipType === "REGULAR" ? 100 : 60;

  // Mirror the reweighting from scoreMember: with no loan history, Pillar 1's
  // weight is redistributed across Pillars 2 & 3. (Older score rows predate the
  // flag, so fall back to whether a repayment score was recorded.)
  const hasLoanHistory = f.hasLoanHistory ?? f.repaymentScore != null;
  let wRepay = w.repayment;
  let wProd = w.production;
  let wFarm = w.farm;
  if (!hasLoanHistory) {
    const denom = wProd + wFarm;
    wProd = denom > 0 ? round2(wProd / denom) : 0;
    wFarm = denom > 0 ? round2(wFarm / denom) : 0;
    wRepay = 0;
  }

  const steps = [
    hasLoanHistory
      ? {
          label: `Pillar 1 — Repayment history (weight ${wRepay})`,
          formula:
            f.dueInstallments > 0
              ? "100 × (paidOnTime ÷ dueInstallments) + 5 × loansFullyRepaid"
              : "baseline (loan open, no installments due yet)",
          substitution:
            f.dueInstallments > 0
              ? `100 × (${f.paidOnTime} ÷ ${f.dueInstallments}) + 5 × ${f.fullyRepaidLoans}`
              : `outstanding balance ₱${fmt(f.outstandingBalance)}`,
          result: fmt(f.repaymentScore),
        }
      : {
          label: "Pillar 1 — Repayment history (not counted)",
          formula: "no loan history yet — its weight is shared across Pillars 2 & 3",
          substitution: `Production weight → ${wProd}, Cooperative standing weight → ${wFarm}`,
          result: "—",
        },
    {
      label: `Pillar 2 — Production consistency (weight ${wProd})`,
      formula: "0.6 × normVolume + 0.4 × normMonths",
      substitution: `0.6 × ${fmt(normVolume)} + 0.4 × ${fmt(normConsistency)}  [vol ${fmt(
        f.totalVolumeKg
      )}kg, ${f.activeMonths} active month(s)]`,
      result: fmt(f.productionScore),
    },
    {
      label: `Pillar 3 — Cooperative standing (weight ${wFarm})`,
      formula: "0.5 × normTenure + 0.5 × classPoints",
      substitution: `0.5 × ${fmt(normTenure)} + 0.5 × ${classPoints} [${f.membershipType}]`,
      result: fmt(f.farmScore),
    },
    {
      label: "Composite credit score",
      formula: hasLoanHistory
        ? "Repayment Weight (wRepay)·Pillar 1 (P1) + Production Weight (wProd)·Pillar 2 (P2) + Standing Weight (wFarm)·Pillar 3 (P3)"
        : "Production Weight (wProd)·Pillar 2 (P2) + Standing Weight (wFarm)·Pillar 3 (P3)  (Pillar 1 not counted)",
      substitution: hasLoanHistory
        ? `${wRepay}×${fmt(f.repaymentScore)} + ${wProd}×${fmt(f.productionScore)} + ${wFarm}×${fmt(f.farmScore)}`
        : `${wProd}×${fmt(f.productionScore)} + ${wFarm}×${fmt(f.farmScore)}`,
      result: fmt(latest.score),
    },
    {
      label: "Risk band",
      formula: `LOW if ≥ ${config.bands.low}; MEDIUM if ≥ ${config.bands.medium}; else HIGH`,
      substitution: `score = ${fmt(latest.score)}`,
      result: `${f.riskBand} — ${f.recommendation}`,
    },
    {
      label: "Suggested credit limit",
      formula: "annualDeliveryValue × deliveryMult × score%  → nearest ₱100",
      substitution: `₱${fmt(f.annualDeliveryValue)} × ${config.limit.deliveryMult} × ${fmt(latest.score)}%`,
      result: `₱${fmt(f.suggestedCreditLimit)}`,
    },
  ];

  return {
    title: "Agricultural Credit Score",
    description:
      "Composite of three weighted pillars (each 0–100). Weights, caps, and risk bands are configurable in system settings (app_settings → creditScoring).",
    steps,
    result: { label: "Credit score", value: fmt(latest.score) },
  };
}

// Latest credit score per active member (for the staff Credit Scoring page).
export async function listLatest() {
  const members = await prisma.member.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, memberNo: true, firstName: true, lastName: true, membershipType: true },
    orderBy: { lastName: "asc" },
  });
  const scores = await prisma.creditScore.findMany({ orderBy: { computedAt: "desc" } });
  const latest = new Map();
  for (const s of scores) if (!latest.has(s.memberId)) latest.set(s.memberId, s);
  return members.map((m) => ({ ...m, creditScore: latest.get(m.id) ?? null }));
}

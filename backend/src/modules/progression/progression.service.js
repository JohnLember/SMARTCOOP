import prisma from "../../config/db.js";

// ---------------------------------------------------------------------------
// Dynamic Member Categorization Algorithm (Algorithm3)
// ---------------------------------------------------------------------------
// Classifies members as Active / Moderate / Inactive from two equally-weighted
// indicators:
//   • Delivery Score (DS) — from rubber kilos delivered in the evaluation period
//   • Loan Score (LS)     — from loan repayment rate (RR = paid ÷ due × 100)
// Activity Score AS = DS + LS. Members with NO loan (e.g. associates, who can't
// borrow) are judged on delivery alone, with DS rescaled to the full 0–100
// range; those with no deliveries this period are Not Applicable.
// Thresholds are configurable via app_settings key "categorization".
// ---------------------------------------------------------------------------

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const DEFAULT_CONFIG = {
  evaluationDays: 30, // one month (kinsina + katapusan)
  delivery: { highKg: 300, midKg: 100, highPts: 50, midPts: 30, lowPts: 10 },
  loan: { highPct: 90, midPct: 70, highPts: 50, midPts: 30, lowPts: 10 },
  category: { active: 80, moderate: 50 },
};

export async function getConfig() {
  const setting = await prisma.appSetting.findUnique({ where: { key: "categorization" } });
  const v = setting?.value;
  if (!v) return DEFAULT_CONFIG;
  return {
    evaluationDays: v.evaluationDays ?? DEFAULT_CONFIG.evaluationDays,
    delivery: { ...DEFAULT_CONFIG.delivery, ...(v.delivery ?? {}) },
    loan: { ...DEFAULT_CONFIG.loan, ...(v.loan ?? {}) },
    category: { ...DEFAULT_CONFIG.category, ...(v.category ?? {}) },
  };
}

function deliveryScore(rk, c) {
  if (rk >= c.delivery.highKg) return c.delivery.highPts;
  if (rk >= c.delivery.midKg) return c.delivery.midPts;
  return c.delivery.lowPts;
}

function loanScore(rr, c) {
  if (rr >= c.loan.highPct) return c.loan.highPts;
  if (rr >= c.loan.midPct) return c.loan.midPts;
  return c.loan.lowPts;
}

// Pure evaluation over gathered inputs.
export function evaluate({ rk, totalLoanPaid, totalLoanDue, hasLoan }, config = DEFAULT_CONFIG) {
  const ds = deliveryScore(Number(rk), config);
  const categoryFor = (as) =>
    as >= config.category.active ? "ACTIVE" : as >= config.category.moderate ? "MODERATE" : "INACTIVE";

  // No loan (e.g. associates, who can't borrow) → no repayment signal. Judge on
  // delivery alone, rescaling DS to the full 0–100 range so a strong deliverer
  // can still reach Active. With no deliveries this period either, there's
  // nothing to judge → Not Applicable.
  if (!hasLoan) {
    if (Number(rk) <= 0) {
      return {
        deliveryScore: ds,
        loanScore: null,
        activityScore: null,
        repaymentRate: null,
        category: "NOT_APPLICABLE",
        hasLoan: false,
        rk: Number(rk),
        totalLoanPaid: 0,
        totalLoanDue: 0,
      };
    }
    const maxDs = config.delivery.highPts;
    const as = maxDs > 0 ? round2((ds / maxDs) * 100) : 0;
    return {
      deliveryScore: ds,
      loanScore: null,
      activityScore: as,
      repaymentRate: null,
      category: categoryFor(as),
      hasLoan: false,
      rk: Number(rk),
      totalLoanPaid: 0,
      totalLoanDue: 0,
    };
  }

  const rr = totalLoanDue > 0 ? (Number(totalLoanPaid) / Number(totalLoanDue)) * 100 : 0;
  const ls = loanScore(rr, config);
  const as = ds + ls;

  return {
    deliveryScore: ds,
    loanScore: ls,
    activityScore: as,
    repaymentRate: round2(rr),
    category: categoryFor(as),
    hasLoan: true,
    rk: Number(rk),
    totalLoanPaid: round2(totalLoanPaid),
    totalLoanDue: round2(totalLoanDue),
  };
}

// Gathers RK (delivery kilos in the evaluation window) and loan totals.
async function getInputs(memberId, config) {
  const since = new Date();
  since.setDate(since.getDate() - config.evaluationDays);

  const [rkAgg, loanAgg, loanCount] = await Promise.all([
    prisma.rubberDelivery.aggregate({
      where: { memberId, deliveryDate: { gte: since } },
      _sum: { weightKg: true },
    }),
    prisma.loanSchedule.aggregate({
      where: { loan: { memberId } },
      _sum: { totalDue: true, amountPaid: true },
    }),
    prisma.loan.count({ where: { memberId } }),
  ]);

  return {
    rk: Number(rkAgg._sum.weightKg ?? 0),
    totalLoanPaid: Number(loanAgg._sum.amountPaid ?? 0),
    totalLoanDue: Number(loanAgg._sum.totalDue ?? 0),
    hasLoan: loanCount > 0,
  };
}

// Evaluates one member, persists the results, and returns the evaluation.
export async function evaluateAndSave(memberId) {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) return null;

  const config = await getConfig();
  const inputs = await getInputs(memberId, config);
  const r = evaluate(inputs, config);

  const updated = await prisma.member.update({
    where: { id: memberId },
    data: {
      deliveryScore: r.deliveryScore,
      loanScore: r.loanScore,
      activityScore: r.activityScore,
      repaymentRate: r.repaymentRate,
      activityCategory: r.category,
      lastCategorizedAt: new Date(),
    },
  });

  return { member: updated, evaluation: r };
}

// Evaluates all active members; returns a category summary.
export async function evaluateAll() {
  const members = await prisma.member.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  const summary = { evaluated: 0, ACTIVE: 0, MODERATE: 0, INACTIVE: 0, NOT_APPLICABLE: 0 };
  for (const m of members) {
    const res = await evaluateAndSave(m.id);
    if (res) {
      summary.evaluated += 1;
      summary[res.evaluation.category] += 1;
    }
  }
  return summary;
}

const fmt = (n) =>
  Number(Math.round(Number(n) * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });

// Step-by-step explanation of the categorization.
export async function explain(memberId) {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) return null;

  const config = await getConfig();
  const inputs = await getInputs(memberId, config);
  const r = evaluate(inputs, config);
  const c = config;

  const steps = [];

  steps.push({
    label: "Step 1 — Loan Repayment Rate (RR)",
    formula: "RR = Total Loan Paid ÷ Total Loan Due × 100",
    substitution: r.hasLoan
      ? `${fmt(r.totalLoanPaid)} ÷ ${fmt(r.totalLoanDue)} × 100`
      : "member has no loan → RR is undefined",
    result: r.hasLoan ? `${fmt(r.repaymentRate)}%` : "N/A",
  });

  steps.push({
    label: `Step 2 — Delivery Score (DS), RK over last ${c.evaluationDays} days`,
    formula: `DS = ${c.delivery.highPts} if RK ≥ ${c.delivery.highKg};  ${c.delivery.midPts} if ${c.delivery.midKg} ≤ RK < ${c.delivery.highKg};  ${c.delivery.lowPts} if RK < ${c.delivery.midKg}`,
    substitution: `RK = ${fmt(r.rk)} kg`,
    result: `${r.deliveryScore}`,
  });

  if (r.hasLoan) {
    steps.push({
      label: "Step 3 — Loan Score (LS)",
      formula: `LS = ${c.loan.highPts} if RR ≥ ${c.loan.highPct}%;  ${c.loan.midPts} if ${c.loan.midPct}% ≤ RR < ${c.loan.highPct}%;  ${c.loan.lowPts} if RR < ${c.loan.midPct}%`,
      substitution: `RR = ${fmt(r.repaymentRate)}%`,
      result: `${r.loanScore}`,
    });
    steps.push({
      label: "Step 4 — Activity Score (AS)",
      formula: "AS = DS + LS",
      substitution: `${r.deliveryScore} + ${r.loanScore}`,
      result: `${r.activityScore}`,
    });
    steps.push({
      label: "Step 5 — Membership Category (MC)",
      formula: `Active if AS ≥ ${c.category.active};  Moderate if ${c.category.moderate} ≤ AS < ${c.category.active};  Inactive if AS < ${c.category.moderate}`,
      substitution: `AS = ${r.activityScore}`,
      result: r.category,
    });
  } else if (r.category === "NOT_APPLICABLE") {
    steps.push({
      label: "Step 3 — Membership Category (MC)",
      formula: "No loan and no deliveries this period — nothing to score",
      substitution: `no loan on record, RK = ${fmt(r.rk)} kg`,
      result: "Not Applicable",
    });
  } else {
    steps.push({
      label: "Step 3 — Activity Score (AS), delivery-only",
      formula: `No loan (associate) → judged on delivery alone: AS = DS ÷ ${c.delivery.highPts} × 100`,
      substitution: `${r.deliveryScore} ÷ ${c.delivery.highPts} × 100`,
      result: `${r.activityScore}`,
    });
    steps.push({
      label: "Step 4 — Membership Category (MC)",
      formula: `Active if AS ≥ ${c.category.active};  Moderate if ${c.category.moderate} ≤ AS < ${c.category.active};  Inactive if AS < ${c.category.moderate}`,
      substitution: `AS = ${r.activityScore}`,
      result: r.category,
    });
  }

  return {
    title: "Dynamic Member Categorization",
    description:
      "Activity Score = Delivery Score + Loan Score (equal weights) for members with a loan. Members with no loan are judged on delivery alone (DS rescaled to 0–100); those with no deliveries this period are Not Applicable. Thresholds are configurable in system settings (app_settings → categorization).",
    steps,
    result: {
      label: r.category === "NOT_APPLICABLE" ? "Category" : "Category (Activity Score)",
      value: r.category === "NOT_APPLICABLE" ? "Not Applicable" : `${r.category} (${r.activityScore})`,
    },
  };
}

import prisma from "../../config/db.js";
import { notFound, badRequest } from "../../utils/httpError.js";
import { logActivity } from "../../utils/activityLog.js";
import { evaluateAndSave } from "../progression/progression.service.js";
import * as credit from "../finance/credit.service.js";
import { promoteIfEligible } from "../members/members.service.js";

const deliveryInclude = {
  member: { select: { id: true, memberNo: true, firstName: true, lastName: true } },
  batch: { include: { barangay: true } },
  receipt: true,
};

export function list({ batchId, memberId }) {
  const where = {};
  if (batchId) where.batchId = Number(batchId);
  if (memberId) where.memberId = Number(memberId);

  return prisma.rubberDelivery.findMany({
    where,
    orderBy: { deliveryDate: "desc" },
    include: deliveryInclude,
  });
}

export async function getById(id) {
  const delivery = await prisma.rubberDelivery.findUnique({
    where: { id },
    include: deliveryInclude,
  });
  if (!delivery) throw notFound("Delivery not found");
  return delivery;
}

// Records a delivery, auto-computes the total, and generates a receipt — all in
// one transaction. Then re-evaluates the member's progression (volume changed).
export async function create(data, actorId) {
  const batch = await prisma.loadingBatch.findUnique({ where: { id: data.batchId } });
  if (!batch) throw badRequest("Loading batch does not exist");
  if (batch.status !== "OPEN") throw badRequest("Cannot add deliveries to a closed batch");

  const member = await prisma.member.findUnique({ where: { id: data.memberId } });
  if (!member) throw badRequest("Member does not exist");

  const weightKg = Number(data.weightKg);
  const pricePerKg = Number(data.pricePerKg);
  const totalAmount = Math.round(weightKg * pricePerKg * 100) / 100;

  // Staff-entered deductions (default 0). Loans are NOT deducted here: members
  // pay their amortization in cash at the office and staff record it against the
  // schedule (see recordPayment in finance/loans.service.js). This used to
  // auto-deduct due installments out of the proceeds, which is not how this
  // cooperative collects.
  const cbu = Number(data.cbu ?? 0);
  const supplies = Number(data.supplies ?? 0); // acid / tapping knife
  const dayong = Number(data.dayong ?? 0);

  const deliveryDate = data.deliveryDate ? new Date(data.deliveryDate) : new Date();

  const delivery = await prisma.$transaction(async (tx) => {
    const created = await tx.rubberDelivery.create({
      data: {
        memberId: data.memberId,
        batchId: data.batchId,
        weightKg,
        pricePerKg,
        totalAmount,
        deliveryDate,
      },
    });

    // Automated receipt: gross − (CBU + supplies + dayong) = net. The membership
    // fee is collected on the membership application, not on a delivery, so it
    // is left at its 0 default here.
    const netAmount = Math.round((totalAmount - cbu - supplies - dayong) * 100) / 100;

    await tx.receipt.create({
      data: {
        deliveryId: created.id,
        memberId: data.memberId,
        grossAmount: totalAmount,
        // Always 0 on new receipts — kept on the model so historical receipts,
        // issued while the automatic deduction existed, still print correctly.
        loanDeduction: 0,
        cbu,
        supplies,
        dayong,
        netAmount,
      },
    });

    return created;
  });

  await logActivity(
    actorId,
    `Recorded delivery: ${weightKg}kg for ${member.memberNo} (₱${totalAmount})`
  );

  // Re-evaluate progression so priority score reflects the new volume, and the
  // credit score with it — production consistency is one of its three pillars.
  await evaluateAndSave(data.memberId).catch(() => {});
  await credit.evaluateAndSave(data.memberId).catch(() => {});
  // Accumulated CBU may have crossed the Regular threshold.
  await promoteIfEligible(data.memberId).catch(() => {});

  return getById(delivery.id);
}

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const fmt = (n) =>
  Number(Math.round(Number(n) * 100) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const DEFAULT_DEDUCTIONS = { cbu: 50, supplies: 0, dayong: 20 };

// Suggested default deduction amounts (prefilled in the delivery form).
export async function getDeductionDefaults() {
  const setting = await prisma.appSetting.findUnique({ where: { key: "deductions" } });
  return { ...DEFAULT_DEDUCTIONS, ...(setting?.value ?? {}) };
}

// Step-by-step explanation of a delivery's gross, deductions, and net.
export async function explainDelivery(id) {
  const d = await prisma.rubberDelivery.findUnique({
    where: { id },
    include: { receipt: true },
  });
  if (!d) return null;

  const r = d.receipt ?? {};
  const gross = Number(d.totalAmount);
  const loan = Number(r.loanDeduction ?? 0);
  const cbu = Number(r.cbu ?? 0);
  const supplies = Number(r.supplies ?? 0);
  const dayong = Number(r.dayong ?? 0);
  const net = d.receipt ? Number(r.netAmount) : gross;
  const totalDeductions = round2(loan + cbu + supplies + dayong);

  // The loan row only appears on receipts issued while the automatic deduction
  // existed. New deliveries never touch a loan, so showing a "less: loan ₱0.00"
  // line would imply a deduction that no longer happens.
  const loanStep =
    loan > 0
      ? [
          {
            label: "Less: Loan (legacy automatic deduction)",
            formula: "− due loan installment(s)",
            substitution: `− ₱${fmt(loan)}`,
            result: `₱${fmt(loan)}`,
          },
        ]
      : [];

  const steps = [
    {
      label: "Gross income (delivery total)",
      formula: "price per kg × total kilos",
      substitution: `₱${fmt(d.pricePerKg)} × ${fmt(d.weightKg)} kg`,
      result: `₱${fmt(gross)}`,
    },
    {
      label: "Less: CBU (Capital Build-Up)",
      formula: "− CBU",
      substitution: `− ₱${fmt(cbu)}`,
      result: `₱${fmt(cbu)}`,
    },
    ...loanStep,
    {
      label: "Less: Acid / Tapping Knife",
      formula: "− supplies",
      substitution: `− ₱${fmt(supplies)}`,
      result: `₱${fmt(supplies)}`,
    },
    {
      label: "Less: Dayong",
      formula: "− Dayong",
      substitution: `− ₱${fmt(dayong)}`,
      result: `₱${fmt(dayong)}`,
    },
    {
      label: "Net income (receipt)",
      formula: "gross − (CBU + acid/tapping knife + dayong)",
      substitution: `₱${fmt(gross)} − ₱${fmt(totalDeductions)}`,
      result: `₱${fmt(net)}`,
    },
  ];

  return {
    title: "Delivery Net Income Computation",
    description: `Delivery on ${new Date(d.deliveryDate)
      .toISOString()
      .slice(0, 10)}. Gross = price × total kilos, less CBU (Capital Build-Up), acid/tapping knife, and dayong = net income paid to the member. Loan repayments are recorded separately, at the office. Membership fees are collected on the membership application, not here.`,
    steps,
    result: { label: "Net income", value: `₱${fmt(net)}` },
  };
}

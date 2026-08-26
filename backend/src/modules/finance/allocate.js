// Pure amortization-payment math. No Prisma, no dates, no I/O — so it can be
// tested directly (see allocate.test.js) and so recordPayment can store the
// exact plan it executed, which is the only thing that makes a void reversible.

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// A schedule row's status is a function of what it has been paid — never a flag
// set independently. Record and void both derive it from here, so a reversal
// lands on exactly the status the row had before.
export function statusFor(totalDue, amountPaid) {
  if (Number(amountPaid) <= 0) return "PENDING";
  return Number(amountPaid) >= Number(totalDue) ? "PAID" : "PARTIAL";
}

// Staff anchor a payment to the period the member is paying, then anything left
// over spills FORWARD into the next unpaid periods. Forward only: the anchor is
// a deliberate choice, so silently reaching backwards would move the member's
// money somewhere they didn't name.
//
// Note there is no "only what is already due" rule here, unlike the delivery
// deduction this replaced — paying ahead is a normal thing to walk into an
// office and do.
//
// rows: [{ id, periodNo, totalDue, amountPaid, status }]
// -> { plan: [{ scheduleId, periodNo, amount, newPaid, status }], applied, unapplied }
export function planAllocation(rows, amount, anchorPeriodNo) {
  let remaining = round2(amount);
  const plan = [];

  const candidates = rows
    .filter((r) => r.status !== "PAID" && r.periodNo >= anchorPeriodNo)
    .sort((a, b) => a.periodNo - b.periodNo);

  for (const row of candidates) {
    if (remaining <= 0) break;
    const need = round2(Number(row.totalDue) - Number(row.amountPaid));
    if (need <= 0) continue;

    const pay = round2(Math.min(need, remaining));
    const newPaid = round2(Number(row.amountPaid) + pay);

    plan.push({
      scheduleId: row.id,
      periodNo: row.periodNo,
      amount: pay,
      newPaid,
      status: statusFor(row.totalDue, newPaid),
    });
    remaining = round2(remaining - pay);
  }

  // `unapplied` is money the schedule has no room for. The caller refuses the
  // payment rather than recording a figure it did not actually apply.
  return { plan, applied: round2(round2(amount) - remaining), unapplied: remaining };
}

// The loan's own state is DERIVED from its schedule, never decremented as
// payments come in. Accumulated arithmetic drifts and, worse, has to be undone
// separately on a void; recomputing from the rows is correct in both directions.
// Principal falls only when a period is settled in full, matching how the
// schedule was built.
export function deriveLoanState(rows, principalAmount) {
  const paidPrincipal = rows
    .filter((r) => r.status === "PAID")
    .reduce((s, r) => s + Number(r.principalDue), 0);

  const allPaid = rows.length > 0 && rows.every((r) => r.status === "PAID");

  return {
    remainingBalance: allPaid ? 0 : round2(Math.max(0, Number(principalAmount) - paidPrincipal)),
    status: allPaid ? "INACTIVE" : "ACTIVE",
  };
}

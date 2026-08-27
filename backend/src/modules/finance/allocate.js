// Pure amortization-payment math. No Prisma, no dates, no I/O — so it can be
// tested directly (see allocate.test.js) and so recordPayment can store the
// exact plan it executed, which is the only thing that makes a void reversible.

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// The cooperative does not accept token amounts at the counter: a payment must
// be at least this much.
export const MIN_PAYMENT = 200;

// What is still owed from a period onward — the ceiling on any one payment,
// since spillover only travels forward.
export function outstandingFrom(rows, anchorPeriodNo) {
  return round2(
    rows
      .filter((r) => r.status !== "PAID" && r.periodNo >= anchorPeriodNo)
      .reduce((s, r) => s + (Number(r.totalDue) - Number(r.amountPaid)), 0)
  );
}

// The smallest payment this anchor will accept. Normally MIN_PAYMENT, but a loan
// whose last period owes less than that has to stay closable — a flat floor plus
// the no-overpayment rule would otherwise leave a ₱150 remainder unpayable
// forever, with no amount at all satisfying both ends.
export function minPaymentFor(rows, anchorPeriodNo) {
  const outstanding = outstandingFrom(rows, anchorPeriodNo);
  return outstanding > 0 ? Math.min(MIN_PAYMENT, outstanding) : 0;
}

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

// What the member is actually asked for, and what they have actually handed over
// — interest included.
//
// `Loan.remainingBalance` is PRINCIPAL only: it drops a whole period at a time
// and never counts interest (see deriveLoanState below), which makes it the
// wrong figure to put in front of a member under the words "loan balance". These
// three come from the schedule, where every peso the member owes is written down.
//
// rows: [{ totalDue, amountPaid }]
export function deriveTotals(rows) {
  const totalDue = round2(rows.reduce((s, r) => s + Number(r.totalDue), 0));
  const totalPaid = round2(rows.reduce((s, r) => s + Number(r.amountPaid), 0));
  return { totalDue, totalPaid, totalOutstanding: round2(Math.max(0, totalDue - totalPaid)) };
}

// Proves the schedule matches the payments that produced it. For every row:
//
//   row.amountPaid == Σ alloc.amount over every LIVE payment's allocations
//
// A wrong number in amountPaid is silent — nothing crashes, nothing looks broken,
// and the balance is simply wrong forever. So the write path re-derives the
// schedule from the allocations before committing and refuses to commit if the
// two disagree, which catches the whole allocation path including mistakes
// nobody anticipated (a double-void, say) rather than one guarded case.
//
// Pure on purpose: the service is a thin wrapper that fetches rows and throws,
// and the same function is what a reconciliation audit over every loan would call.
//
// scheduleRows: [{ id, periodNo, totalDue, amountPaid }]
// livePayments: [{ voidedAt, allocations: [{ scheduleId, amount }] }]
// -> [{ scheduleId, periodNo, expected, actual, reason }], empty when healthy
export function reconcile(scheduleRows, livePayments) {
  const expected = new Map();
  for (const payment of livePayments) {
    // Callers pass live payments, but a voided one contributes nothing by
    // definition — skipping it here means a caller that forgets cannot corrupt
    // the check that exists to catch corruption.
    if (payment.voidedAt) continue;
    for (const alloc of payment.allocations ?? []) {
      const key = Number(alloc.scheduleId);
      expected.set(key, round2((expected.get(key) ?? 0) + Number(alloc.amount)));
    }
  }

  const problems = [];
  for (const row of scheduleRows) {
    const actual = round2(Number(row.amountPaid));
    const want = round2(expected.get(Number(row.id)) ?? 0);
    const at = { scheduleId: row.id, periodNo: row.periodNo, expected: want, actual };

    // Half a centavo of tolerance: both sides are 2dp money, so anything bigger
    // is a real discrepancy and anything smaller is float dust.
    if (Math.abs(actual - want) > 0.005) {
      problems.push({ ...at, reason: "amountPaid does not match the payments recorded against it" });
    }

    // Bounds, on the same pass. These catch a row that is wrong in a way the sum
    // agrees with — an allocation that itself overshot the period, say.
    if (actual < 0) {
      problems.push({ ...at, reason: "amountPaid is negative" });
    } else if (actual - Number(row.totalDue) > 0.005) {
      problems.push({ ...at, reason: `amountPaid exceeds the ${round2(Number(row.totalDue))} due` });
    }
  }
  return problems;
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

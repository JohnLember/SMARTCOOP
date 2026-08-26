// node --test src/modules/finance/allocate.test.js
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  planAllocation,
  deriveLoanState,
  statusFor,
  outstandingFrom,
  minPaymentFor,
  MIN_PAYMENT,
} from "./allocate.js";

// A 3-month, 30,000 loan at 1%/mo, diminishing interest — the shape buildSchedule
// produces. Total of all payments: 30,600.
const fresh = () => [
  { id: 1, periodNo: 1, principalDue: 10000, interestDue: 300, totalDue: 10300, amountPaid: 0, status: "PENDING" },
  { id: 2, periodNo: 2, principalDue: 10000, interestDue: 200, totalDue: 10200, amountPaid: 0, status: "PENDING" },
  { id: 3, periodNo: 3, principalDue: 10000, interestDue: 100, totalDue: 10100, amountPaid: 0, status: "PENDING" },
];

// Applies a plan to a copy of the rows, the way recordPayment does in SQL.
const apply = (rows, plan) =>
  rows.map((r) => {
    const hit = plan.find((p) => p.scheduleId === r.id);
    return hit ? { ...r, amountPaid: hit.newPaid, status: hit.status } : r;
  });

// Undoes a stored allocation, the way voidPayment does.
const reverse = (rows, plan) =>
  rows.map((r) => {
    const hit = plan.find((p) => p.scheduleId === r.id);
    if (!hit) return r;
    const amountPaid = Math.round((r.amountPaid - hit.amount) * 100) / 100;
    return { ...r, amountPaid, status: statusFor(r.totalDue, amountPaid) };
  });

test("exact payment settles one period", () => {
  const { plan, unapplied } = planAllocation(fresh(), 10300, 1);
  assert.equal(plan.length, 1);
  assert.deepEqual(plan[0], { scheduleId: 1, periodNo: 1, amount: 10300, newPaid: 10300, status: "PAID" });
  assert.equal(unapplied, 0);
});

test("short payment leaves the period PARTIAL", () => {
  const { plan, unapplied } = planAllocation(fresh(), 5000, 1);
  assert.equal(plan[0].status, "PARTIAL");
  assert.equal(plan[0].newPaid, 5000);
  assert.equal(unapplied, 0);
});

test("excess spills forward across periods", () => {
  const { plan, applied, unapplied } = planAllocation(fresh(), 25000, 1);
  assert.deepEqual(
    plan.map((p) => [p.periodNo, p.amount, p.status]),
    [
      [1, 10300, "PAID"],
      [2, 10200, "PAID"],
      [3, 4500, "PARTIAL"],
    ]
  );
  assert.equal(applied, 25000);
  assert.equal(unapplied, 0);
});

test("spillover never reaches backwards past the anchor", () => {
  const { plan } = planAllocation(fresh(), 30000, 2);
  assert.deepEqual(plan.map((p) => p.periodNo), [2, 3]);
  // Period 1 is untouched even though it is unpaid and earlier.
  assert.equal(plan.find((p) => p.periodNo === 1), undefined);
});

test("more than the loan can absorb is reported, not swallowed", () => {
  const { applied, unapplied } = planAllocation(fresh(), 40000, 1);
  assert.equal(applied, 30600);
  assert.equal(unapplied, 9400);
});

test("a partly-paid period is topped up, not double-counted", () => {
  const rows = fresh();
  rows[0] = { ...rows[0], amountPaid: 4000, status: "PARTIAL" };
  const { plan } = planAllocation(rows, 6300, 1);
  assert.equal(plan[0].amount, 6300);
  assert.equal(plan[0].newPaid, 10300);
  assert.equal(plan[0].status, "PAID");
});

// The invariant voidPayment depends on: applying a plan and then reversing it
// must land back on exactly the rows we started from.
test("plan then reverse restores the original rows", () => {
  const before = fresh();
  const { plan } = planAllocation(before, 15450, 1);
  const after = apply(before, plan);
  assert.notDeepEqual(after, before);
  assert.deepEqual(reverse(after, plan), before);
});

test("reversal restores a period that was already partly paid", () => {
  const before = fresh().map((r) => (r.periodNo === 1 ? { ...r, amountPaid: 300, status: "PARTIAL" } : r));
  const { plan } = planAllocation(before, 20000, 1);
  assert.deepEqual(reverse(apply(before, plan), plan), before);
});

test("loan state is derived from the schedule", () => {
  const rows = fresh();
  assert.deepEqual(deriveLoanState(rows, 30000), { remainingBalance: 30000, status: "ACTIVE" });

  const onePaid = apply(rows, planAllocation(rows, 10300, 1).plan);
  assert.deepEqual(deriveLoanState(onePaid, 30000), { remainingBalance: 20000, status: "ACTIVE" });

  // A PARTIAL period does not move the principal.
  const partial = apply(onePaid, planAllocation(onePaid, 5000, 2).plan);
  assert.equal(deriveLoanState(partial, 30000).remainingBalance, 20000);

  const allPaid = apply(rows, planAllocation(rows, 30600, 1).plan);
  assert.deepEqual(deriveLoanState(allPaid, 30000), { remainingBalance: 0, status: "INACTIVE" });
});

test("outstanding is counted from the anchor forward only", () => {
  const rows = fresh();
  assert.equal(outstandingFrom(rows, 1), 30600);
  assert.equal(outstandingFrom(rows, 3), 10100);

  rows[1] = { ...rows[1], amountPaid: 200, status: "PARTIAL" };
  assert.equal(outstandingFrom(rows, 2), 10000 + 10100);
});

test("the minimum payment is normally the flat floor", () => {
  assert.equal(minPaymentFor(fresh(), 1), MIN_PAYMENT);
  assert.equal(MIN_PAYMENT, 200);
});

// The deadlock a flat floor would create: overpayment is refused, so if the
// floor stayed at 200 a loan with 150 left could never be closed by any amount.
test("the minimum drops to the remainder when less than the floor is left", () => {
  const rows = fresh().map((r) =>
    r.periodNo === 3
      ? { ...r, amountPaid: 9950, status: "PARTIAL" }
      : { ...r, amountPaid: r.totalDue, status: "PAID" }
  );
  assert.equal(outstandingFrom(rows, 3), 150);
  assert.equal(minPaymentFor(rows, 3), 150);

  // And that exact amount closes the loan.
  const { plan, unapplied } = planAllocation(rows, 150, 3);
  assert.equal(unapplied, 0);
  assert.equal(deriveLoanState(apply(rows, plan), 30000).status, "INACTIVE");
});

test("a fully paid loan has no minimum left to pay", () => {
  const rows = fresh();
  const settled = apply(rows, planAllocation(rows, 30600, 1).plan);
  assert.equal(minPaymentFor(settled, 1), 0);
});

test("voiding the closing payment reopens the loan", () => {
  const rows = fresh();
  const paidUpTo2 = apply(rows, planAllocation(rows, 20500, 1).plan);
  const { plan } = planAllocation(paidUpTo2, 10100, 3);
  const closed = apply(paidUpTo2, plan);
  assert.equal(deriveLoanState(closed, 30000).status, "INACTIVE");
  assert.deepEqual(deriveLoanState(reverse(closed, plan), 30000), {
    remainingBalance: 10000,
    status: "ACTIVE",
  });
});

// node --test src/lib/receiptRows.test.js
//
// The thing worth guarding here is DIRECTION: which column a row lands in.
// Putting a loan payment in the Received column would tell a member they earned
// money they actually handed over.
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReceiptRows, countsByType, RECEIPT_TYPES } from "./receiptRows.js";

const delivery = {
  id: 12,
  deliveryId: 5,
  dateIssued: "2026-08-26T00:00:00.000Z",
  grossAmount: "6000.00",
  netAmount: "5930.00",
};
const membership = {
  id: 4,
  deliveryId: null,
  dateIssued: "2026-08-01T00:00:00.000Z",
  membershipFee: "300.00",
};
const payment = {
  id: 43,
  paymentNo: "LP-0043",
  paymentDate: "2026-08-20T00:00:00.000Z",
  amount: "3000.00",
  voidedAt: null,
};
const voidedPayment = { ...payment, id: 41, paymentNo: "LP-0041", amount: "1200.00", voidedAt: "2026-08-26T00:00:00.000Z", paymentDate: "2026-08-12T00:00:00.000Z" };

test("a delivery receipt is money RECEIVED, at its net", () => {
  const [row] = buildReceiptRows([delivery], []);
  assert.equal(row.type, "Delivery");
  assert.equal(row.received, 5930, "the net, not the gross");
  assert.equal(row.paid, null);
  assert.equal(row.no, "OR-000012");
});

test("a membership fee is money PAID", () => {
  const [row] = buildReceiptRows([membership], []);
  assert.equal(row.type, "Membership");
  assert.equal(row.paid, 300);
  assert.equal(row.received, null);
  assert.equal(row.no, "MR-000004");
});

test("a loan payment is money PAID, never received", () => {
  const [row] = buildReceiptRows([], [payment]);
  assert.equal(row.type, "Loan payment");
  assert.equal(row.paid, 3000);
  assert.equal(row.received, null, "a loan payment must never land in the Received column");
  assert.equal(row.no, "LP-0043");
});

test("both sources merge, newest first", () => {
  const rows = buildReceiptRows([delivery, membership], [payment, voidedPayment]);
  assert.deepEqual(rows.map((r) => r.no), ["OR-000012", "LP-0043", "LP-0041", "MR-000004"]);
});

test("voided payments are listed but carry their void date", () => {
  const rows = buildReceiptRows([], [payment, voidedPayment]);
  assert.equal(rows.length, 2, "a voided payment is never hidden");
  const voided = rows.find((r) => r.no === "LP-0041");
  assert.ok(voided.voidedAt, "it must be flagged so the row can be struck through");
});

// The rule every total in the app follows: shown, but not counted.
test("a total that skips voided rows counts only live money", () => {
  const rows = buildReceiptRows([delivery], [payment, voidedPayment]);
  const totals = rows.reduce(
    (acc, r) =>
      r.voidedAt ? acc : { received: acc.received + (r.received ?? 0), paid: acc.paid + (r.paid ?? 0) },
    { received: 0, paid: 0 }
  );
  assert.deepEqual(totals, { received: 5930, paid: 3000 }, "the voided 1,200 must not appear");
});

test("counts per type drive the filter labels", () => {
  const rows = buildReceiptRows([delivery, membership], [payment, voidedPayment]);
  assert.deepEqual(countsByType(rows), { Delivery: 1, Membership: 1, "Loan payment": 2 });
  assert.deepEqual(RECEIPT_TYPES, ["Delivery", "Membership", "Loan payment"]);
});

test("empty sources give an empty list, not a crash", () => {
  assert.deepEqual(buildReceiptRows(), []);
  assert.deepEqual(buildReceiptRows([], []), []);
});

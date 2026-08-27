// node --test src/lib/monthlySummary.test.js
import assert from "node:assert/strict";
import { test } from "node:test";
import { monthlySummary, hasVolume, hasMoney, MONEY_KEYS } from "./monthlySummary.js";

// Pinned "today" so the six-month window is Mar..Aug 2026 in every run.
const NOW = new Date(2026, 7, 27); // August 2026

const delivery = (date, kg, receipt) => ({ deliveryDate: date, weightKg: kg, receipt });
const receipt = (netAmount, extra = {}) => ({
  netAmount,
  cbu: 0,
  dayong: 0,
  supplies: 0,
  membershipFee: 0,
  ...extra,
});

test("the window is six months ending on the current one", () => {
  const rows = monthlySummary([], NOW);
  assert.equal(rows.length, 6);
  assert.deepEqual(
    rows.map((r) => r.key),
    ["2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]
  );
  assert.equal(rows.at(-1).label, "Aug");
});

test("a delivery lands in its own month, not another", () => {
  const rows = monthlySummary(
    [delivery("2026-07-02", 80, receipt(3000)), delivery("2026-08-10", 100, receipt(4300))],
    NOW
  );
  const by = Object.fromEntries(rows.map((r) => [r.key, r]));
  assert.equal(by["2026-07"].kg, 80);
  assert.equal(by["2026-08"].kg, 100);
  assert.equal(by["2026-06"].kg, 0);
});

test("two deliveries in one month are summed", () => {
  const rows = monthlySummary(
    [
      delivery("2026-08-01", 50, receipt(2000, { cbu: 100 })),
      delivery("2026-08-20", 25.5, receipt(1000, { cbu: 50 })),
    ],
    NOW
  );
  const aug = rows.at(-1);
  assert.equal(aug.kg, 75.5);
  assert.equal(aug.net, 3000);
  assert.equal(aug.cbu, 150);
});

test("a delivery outside the window is ignored entirely", () => {
  const rows = monthlySummary(
    [delivery("2025-12-31", 999, receipt(99999)), delivery("2026-02-28", 500, receipt(5000))],
    NOW
  );
  assert.equal(hasVolume(rows), false);
  assert.equal(hasMoney(rows), false);
});

test("every deduction lands on its own key", () => {
  const rows = monthlySummary(
    [
      delivery(
        "2026-08-05",
        120,
        receipt(4300, { cbu: 200, dayong: 300, supplies: 150, membershipFee: 50 })
      ),
    ],
    NOW
  );
  const aug = rows.at(-1);
  assert.deepEqual(
    MONEY_KEYS.map((k) => aug[k]),
    [4300, 200, 300, 150, 50]
  );
});

// A delivery recorded before its receipt is issued: it weighs something, but no
// money has moved, so it must not invent a ₱0 payout row in the money chart.
test("a delivery with no receipt counts kilos but no money", () => {
  const rows = monthlySummary([{ deliveryDate: "2026-08-05", weightKg: 60 }], NOW);
  assert.equal(rows.at(-1).kg, 60);
  assert.equal(hasVolume(rows), true);
  assert.equal(hasMoney(rows), false);
});

test("decimal sums do not leak float dust into the figures", () => {
  const rows = monthlySummary(
    [delivery("2026-08-01", 0.1, receipt(0.1)), delivery("2026-08-02", 0.2, receipt(0.2))],
    NOW
  );
  assert.equal(rows.at(-1).kg, 0.3);
  assert.equal(rows.at(-1).net, 0.3);
});

// Six months of one member's deliveries, oldest first: kilos delivered, and the
// money each month's receipts broke down into.
//
// Built from the deliveries the dashboard has already fetched rather than asking
// the API for another aggregate. Pure and browser-free for the same reason
// receiptRows.js is — the bucketing is the part that can silently put a delivery
// in the wrong month, and that is worth a test without a browser.

// The receipt fields that together account for the gross: what the member took
// home, plus every line deducted from it.
export const MONEY_KEYS = ["net", "cbu", "dayong", "supplies", "membershipFee"];

// The receipt column each key reads. `net` is netAmount; the rest match 1:1.
const RECEIPT_FIELD = { net: "netAmount" };

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// `now` is a parameter so a test can pin the window instead of depending on today.
export function monthlySummary(deliveries = [], now = new Date(), months = 6) {
  const buckets = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: monthKey(d),
      label: d.toLocaleDateString("en-US", { month: "short" }),
      kg: 0,
      ...Object.fromEntries(MONEY_KEYS.map((k) => [k, 0])),
    });
  }

  for (const d of deliveries) {
    const bucket = buckets.find((m) => m.key === monthKey(new Date(d.deliveryDate)));
    if (!bucket) continue; // outside the window
    bucket.kg += Number(d.weightKg);
    // A delivery whose receipt has not been issued yet weighs something but has
    // paid out nothing — it belongs in the volume chart and not the money one.
    if (!d.receipt) continue;
    for (const k of MONEY_KEYS) bucket[k] += Number(d.receipt[RECEIPT_FIELD[k] ?? k] ?? 0);
  }

  // Rounded once at the end: summing decimals leaves dust that a peso tooltip shows.
  return buckets.map((b) => ({
    ...b,
    kg: round2(b.kg),
    ...Object.fromEntries(MONEY_KEYS.map((k) => [k, round2(b[k])])),
  }));
}

export const hasVolume = (rows) => rows.some((m) => m.kg > 0);
export const hasMoney = (rows) => rows.some((m) => MONEY_KEYS.some((k) => m[k] > 0));

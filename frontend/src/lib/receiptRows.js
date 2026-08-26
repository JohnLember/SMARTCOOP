// Everything the cooperative issues a document for, in one list.
//
// Two sources, deliberately not merged in the database: a delivery/membership
// receipt is a `Receipt` row, a loan payment is a `LoanPayment` row. Writing a
// loan payment into both tables would put the same money in two places, and the
// moment one is voided the other is wrong. They are merged here instead, at the
// point of display.
//
// The two amount columns exist because these documents point in opposite
// directions: a delivery receipt is money the member RECEIVED, while membership
// and loan payments are money they PAID. One "Amount" column would let a
// ₱3,000 loan payment be read as ₱3,000 of earnings.

export const RECEIPT_TYPES = ["Delivery", "Membership", "Loan payment"];

const num = (v) => Number(v ?? 0);

// `Receipt` rows: a delivery receipt (OR-) or a membership fee receipt (MR-).
// deliveryId == null is the membership kind, the same test ReceiptDocument uses.
function fromReceipt(r) {
  const membership = r.deliveryId == null;
  return {
    key: `receipt-${r.id}`,
    no: `${membership ? "MR-" : "OR-"}${String(r.id).padStart(6, "0")}`,
    date: r.dateIssued,
    type: membership ? "Membership" : "Delivery",
    // A delivery's figure is the NET — what the member actually took home. The
    // gross and every deduction stay on the printed receipt.
    received: membership ? null : num(r.netAmount),
    paid: membership ? num(r.membershipFee) : null,
    voidedAt: null, // Receipt rows have no void concept
    doc: r, // handed straight to ReceiptDocument
  };
}

function fromPayment(p) {
  return {
    key: `payment-${p.id}`,
    no: p.paymentNo,
    date: p.paymentDate,
    type: "Loan payment",
    received: null,
    paid: num(p.amount),
    voidedAt: p.voidedAt ?? null,
    doc: p,
  };
}

// Newest first. Voided rows are included on purpose — a member holding a
// cancelled slip must still find it here — so anything summing these must skip
// `row.voidedAt` itself.
export function buildReceiptRows(receipts = [], payments = []) {
  return [...receipts.map(fromReceipt), ...payments.map(fromPayment)].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
}

export const countsByType = (rows) =>
  RECEIPT_TYPES.reduce((acc, t) => ({ ...acc, [t]: rows.filter((r) => r.type === t).length }), {});

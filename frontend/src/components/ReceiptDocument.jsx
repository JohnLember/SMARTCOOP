import { Leaf } from "lucide-react";
import { formatDate } from "../lib/format";

const peso = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function fullName(m) {
  return [m.firstName, m.middleName, m.lastName].filter(Boolean).join(" ");
}

function Row({ label, value, strong }) {
  return (
    <div className={`flex justify-between py-1 ${strong ? "font-bold text-[#111111]" : "text-[#2F3437]"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

// Three kinds of printable document, one component:
//   delivery   OR-  gross less deductions = net income
//   membership MR-  the membership fee charged on approval (no delivery)
//   loan       LP-  a payment the member made at the office against their
//                   amortization schedule
// The kind is inferred from the record's own shape, so every existing call site
// keeps passing a plain `receipt`.
const KIND = {
  delivery: { title: "Official Delivery Receipt", label: "Receipt No.", total: "NET INCOME" },
  membership: { title: "Official Membership Receipt", label: "Receipt No.", total: "AMOUNT PAID" },
  loan: { title: "Loan Payment Acknowledgment", label: "Payment No.", total: "AMOUNT PAID" },
};

function kindOf(r) {
  if (r.paymentNo != null && r.loan) return "loan";
  if (r.kind === "membership" || r.deliveryId == null) return "membership";
  return "delivery";
}

// A printable official receipt. Wrapped in #printable-receipt so print CSS can
// isolate it from the rest of the page.
export default function ReceiptDocument({ receipt }) {
  const kind = kindOf(receipt);
  const meta = KIND[kind];
  const d = receipt.delivery ?? {};
  const m = (kind === "loan" ? receipt.loan.member : receipt.member) ?? {};

  const docNo =
    kind === "loan"
      ? receipt.paymentNo
      : kind === "membership"
        ? `MR-${receipt.id ? String(receipt.id).padStart(6, "0") : m.memberNo ?? "—"}`
        : `OR-${String(receipt.id).padStart(6, "0")}`;

  const deductions =
    kind === "loan"
      ? 0
      : Number(receipt.cbu) +
        Number(receipt.loanDeduction) +
        Number(receipt.membershipFee) +
        Number(receipt.supplies) +
        Number(receipt.dayong);

  const total =
    kind === "loan" ? receipt.amount : kind === "membership" ? receipt.membershipFee : receipt.netAmount;

  // A cancelled payment still prints, on purpose: staff need to be able to hand
  // the member the voided document matching the slip already in their hands.
  const voidedAt = kind === "loan" ? receipt.voidedAt : null;

  return (
    <div id="printable-receipt" className="mx-auto max-w-md bg-white p-6 text-sm text-[#111111]">
      {voidedAt && (
        <div className="mb-4 rounded-lg border-2 border-[#9F2F2D] px-3 py-2 text-center">
          <p className="text-lg font-bold uppercase tracking-[0.3em] text-[#9F2F2D]">Voided</p>
          <p className="text-xs text-[#8a2725]">
            Cancelled {formatDate(voidedAt)}
            {receipt.voidReason ? ` · ${receipt.voidReason}` : ""}
          </p>
          <p className="mt-1 text-[10px] text-[#5F5E5A]">
            This payment was reversed and no longer counts toward the loan.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="mb-4 flex items-center gap-3 border-b border-[#EAEAEA] pb-4">
        <div className="rounded-lg bg-[#346538] p-2 text-white">
          <Leaf size={22} />
        </div>
        <div className="leading-tight">
          <p className="text-base font-bold text-[#111111]">SMARTCOOP</p>
          <p className="text-xs text-[#787774]">San Luis Rubber Producer&apos;s Cooperative</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#346538]">{meta.title}</p>
        </div>
        <div className="ml-auto text-right text-xs text-[#787774]">
          <p>{meta.label}</p>
          <p className="font-bold text-[#111111]">{docNo}</p>
        </div>
      </div>

      {/* Member + document info */}
      <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <p className="text-[#5F5E5A]">Member</p>
          <p className="font-medium text-[#111111]">{fullName(m)}</p>
        </div>
        <div>
          <p className="text-[#5F5E5A]">Member No.</p>
          <p className="font-medium text-[#111111]">{m.memberNo}</p>
        </div>
        <div>
          <p className="text-[#5F5E5A]">Barangay</p>
          <p className="font-medium text-[#111111]">{m.barangay?.name ?? "—"}</p>
        </div>
        <div>
          <p className="text-[#5F5E5A]">{kind === "loan" ? "Date paid" : "Date issued"}</p>
          <p className="font-medium text-[#111111]">
            {formatDate(kind === "loan" ? receipt.paymentDate : receipt.dateIssued)}
          </p>
        </div>
        {kind === "loan" && receipt.referenceNo && (
          <div className="col-span-2">
            <p className="text-[#5F5E5A]">Reference</p>
            <p className="font-medium text-[#111111]">{receipt.referenceNo}</p>
          </div>
        )}
      </div>

      {kind === "loan" ? (
        <LoanPaymentBody payment={receipt} />
      ) : kind === "membership" ? (
        <div className="border-t border-[#EAEAEA] pt-2">
          <Row label="Membership fee" value={peso(receipt.membershipFee)} strong />
        </div>
      ) : (
        <>
          {/* Delivery details */}
          <div className="mb-3 rounded-lg bg-[#F7F6F3] p-3 text-xs">
            <Row label="Delivery date" value={formatDate(d.deliveryDate)} />
            <Row label="Loading period" value={d.batch?.periodType ?? "—"} />
            <Row label="Weight" value={`${Number(d.weightKg).toLocaleString()} kg`} />
            <Row label="Dry Rubber Content" value={d.drc != null ? `${d.drc}%` : "—"} />
            <Row label="Price per kg" value={peso(d.pricePerKg)} />
          </div>

          {/* Amounts */}
          <div className="border-t border-[#EAEAEA] pt-2">
            <Row label="Gross income" value={peso(receipt.grossAmount)} strong />
            <div className="my-1 text-xs font-semibold uppercase text-[#5F5E5A]">Less deductions</div>
            <Row label="CBU (Capital Build-Up)" value={peso(receipt.cbu)} />
            {/* Only appears on receipts issued while the automatic loan deduction
                still existed; new deliveries never touch a loan. */}
            {Number(receipt.loanDeduction) > 0 && (
              <Row label="Loan payment" value={peso(receipt.loanDeduction)} />
            )}
            <Row label="Membership" value={peso(receipt.membershipFee)} />
            <Row label="Acid / Tapping Knife" value={peso(receipt.supplies)} />
            <Row label="Dayong" value={peso(receipt.dayong)} />
            <div className="mt-1 border-t border-dashed border-[#EAEAEA] pt-1">
              <Row label="Total deductions" value={peso(deductions)} />
            </div>
          </div>
        </>
      )}

      {/* Total */}
      <div className="mt-3 flex items-baseline justify-between rounded-lg bg-[#EDF3EC] px-3 py-2">
        <span className="font-semibold text-[#2b5330]">{meta.total}</span>
        <span className="text-lg font-bold text-[#346538]">{peso(total)}</span>
      </div>

      {kind === "loan" && (
        <div className="mt-2 space-y-1 text-xs">
          {receipt.remarks && (
            <p className="pt-1 text-[#5F5E5A]">
              Remarks: <span className="text-[#2F3437]">{receipt.remarks}</span>
            </p>
          )}
          <p className="pt-2 text-[#5F5E5A]">
            Received by:{" "}
            <span className="font-medium text-[#111111]">{receipt.recordedBy?.username ?? "—"}</span>
          </p>
        </div>
      )}

      <p className="mt-4 text-center text-[10px] text-[#5F5E5A]">
        This is a system-generated receipt from SMARTCOOP.
      </p>
    </div>
  );
}

// Which installments this payment actually settled. Read straight off the stored
// allocation, so the slip shows what was really applied rather than a fresh
// guess at where the money should have gone.
function LoanPaymentBody({ payment }) {
  const schedule = payment.loan.schedule ?? [];
  const rows = (payment.allocations ?? []).map((a) => ({
    ...a,
    dueDate: schedule.find((r) => r.id === a.scheduleId)?.dueDate,
  }));

  return (
    <>
      <div className="mb-3 rounded-lg bg-[#F7F6F3] p-3 text-xs">
        <Row label="Loan principal" value={peso(payment.loan.principalAmount)} />
        <Row
          label="Term"
          value={`${payment.loan.termMonths} months @ ${Number(payment.loan.interestRate)}%/mo`}
        />
        <Row label="Date issued" value={formatDate(payment.loan.dateIssued)} />
      </div>

      <div className="border-t border-[#EAEAEA] pt-2">
        <div className="my-1 text-xs font-semibold uppercase text-[#5F5E5A]">Applied to</div>
        {rows.length === 0 ? (
          <p className="py-1 text-xs text-[#5F5E5A]">—</p>
        ) : (
          rows.map((r) => (
            <Row
              key={r.scheduleId}
              label={`Period ${r.periodNo}${r.dueDate ? ` — due ${formatDate(r.dueDate)}` : ""}`}
              value={peso(r.amount)}
            />
          ))
        )}
      </div>
    </>
  );
}

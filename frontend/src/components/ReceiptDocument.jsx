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

// A printable official receipt. Wrapped in #printable-receipt so print CSS can
// isolate it from the rest of the page.
export default function ReceiptDocument({ receipt }) {
  const d = receipt.delivery ?? {};
  const m = receipt.member ?? {};
  const deductions =
    Number(receipt.cbu) +
    Number(receipt.loanDeduction) +
    Number(receipt.membershipFee) +
    Number(receipt.supplies) +
    Number(receipt.dayong);

  return (
    <div id="printable-receipt" className="mx-auto max-w-md bg-white p-6 text-sm text-[#111111]">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3 border-b border-[#EAEAEA] pb-4">
        <div className="rounded-lg bg-[#346538] p-2 text-white">
          <Leaf size={22} />
        </div>
        <div className="leading-tight">
          <p className="text-base font-bold text-[#111111]">SMARTCOOP</p>
          <p className="text-xs text-[#787774]">San Luis Rubber Producer's Cooperative</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#346538]">
            Official Delivery Receipt
          </p>
        </div>
        <div className="ml-auto text-right text-xs text-[#787774]">
          <p>Receipt No.</p>
          <p className="font-bold text-[#111111]">
            OR-{String(receipt.id).padStart(6, "0")}
          </p>
        </div>
      </div>

      {/* Member + delivery info */}
      <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <p className="text-[#B0AFAB]">Member</p>
          <p className="font-medium text-[#111111]">{fullName(m)}</p>
        </div>
        <div>
          <p className="text-[#B0AFAB]">Member No.</p>
          <p className="font-medium text-[#111111]">{m.memberNo}</p>
        </div>
        <div>
          <p className="text-[#B0AFAB]">Barangay</p>
          <p className="font-medium text-[#111111]">{m.barangay?.name ?? "—"}</p>
        </div>
        <div>
          <p className="text-[#B0AFAB]">Date issued</p>
          <p className="font-medium text-[#111111]">{formatDate(receipt.dateIssued)}</p>
        </div>
      </div>

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
        <div className="my-1 text-xs font-semibold uppercase text-[#B0AFAB]">Less deductions</div>
        <Row label="CBU (Capital Build-Up)" value={peso(receipt.cbu)} />
        <Row label="Loan payment" value={peso(receipt.loanDeduction)} />
        <Row label="Membership" value={peso(receipt.membershipFee)} />
        <Row label="Acid / Tapping Knife" value={peso(receipt.supplies)} />
        <Row label="Dayong" value={peso(receipt.dayong)} />
        <div className="mt-1 border-t border-dashed border-[#EAEAEA] pt-1">
          <Row label="Total deductions" value={peso(deductions)} />
        </div>
      </div>

      {/* Net */}
      <div className="mt-3 flex items-baseline justify-between rounded-lg bg-[#EDF3EC] px-3 py-2">
        <span className="font-semibold text-[#2b5330]">NET INCOME</span>
        <span className="text-lg font-bold text-[#346538]">{peso(receipt.netAmount)}</span>
      </div>

      {/* Signatures */}
      <div className="mt-8 grid grid-cols-2 gap-6 text-center text-xs text-[#787774]">
        <div>
          <div className="border-t border-[#B0AFAB] pt-1">Member's signature</div>
        </div>
        <div>
          <div className="border-t border-[#B0AFAB] pt-1">Authorized signature</div>
        </div>
      </div>

      <p className="mt-4 text-center text-[10px] text-[#B0AFAB]">
        This is a system-generated receipt from SMARTCOOP.
      </p>
    </div>
  );
}

import { useEffect, useState } from "react";
import api from "../lib/api";
import { Card, Spinner, PageHeader, Badge, Select, Pagination, DataTable, Modal, Button } from "../components/ui";
import ReceiptDocument from "../components/ReceiptDocument";
import { usePagination } from "../lib/usePagination";
import { formatDate } from "../lib/format";
import { Printer } from "lucide-react";

const peso = (n) =>
  `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_COLOR = { PENDING: "amber", APPROVED: "green", REJECTED: "red" };
const SCHED_COLOR = { PAID: "green", PARTIAL: "amber", PENDING: "slate" };
const STATUSES = ["APPROVED", "REJECTED", "PENDING"];
const title = (s) => s.charAt(0) + s.slice(1).toLowerCase();

export default function MyLoans() {
  const [apps, setApps] = useState(null);
  const [loans, setLoans] = useState([]);
  const [status, setStatus] = useState("");
  // The payment slip currently being viewed, for printing.
  const [slip, setSlip] = useState(null);

  useEffect(() => {
    // Both endpoints scope themselves to the signed-in member. Applications carry
    // the outcome; the loan itself carries the balance, so they are joined by
    // loanId rather than asking the API for a combined shape.
    // The list carries no schedule or payments, so each loan is then fetched in
    // full - a member holds one or two.
    Promise.all([api.get("/loan-applications"), api.get("/finance/loans")])
      .then(async ([appRes, loanRes]) => {
        setApps(appRes.data);
        setLoans(
          await Promise.all(
            loanRes.data.map((l) => api.get(`/finance/loans/${l.id}`).then((r) => r.data))
          )
        );
      })
      .catch(() => setApps([]));
  }, []);

  const filtered = (apps ?? []).filter((a) => !status || a.status === status);
  const { page, setPage, pageCount, pageItems } = usePagination(filtered, 10);

  if (!apps) return <Spinner />;

  const loanFor = (app) => loans.find((l) => l.id === app.loanId);
  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: apps.filter((a) => a.status === s).length }),
    {}
  );

  return (
    <div>
      <PageHeader
        title="My Loans"
        subtitle="Every loan you have applied for, and how it was decided"
        actions={
          <Select
            className="w-44"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses ({apps.length})</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {title(s)} ({counts[s]})
              </option>
            ))}
          </Select>
        }
      />

      <Card className="p-0">
        <DataTable>
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">Application No.</th>
              <th className="px-4 py-3 font-medium">Date applied</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Term</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((a) => {
              const loan = loanFor(a);
              return (
                <tr key={a.id} className="hover:bg-[#F7F6F3]">
                  <td className="px-4 py-3 font-medium text-[#2F3437]">{a.applicationNo}</td>
                  <td className="px-4 py-3 text-[#787774]">{formatDate(a.createdAt)}</td>
                  <td className="px-4 py-3 text-[#2F3437]">{peso(a.principalAmount)}</td>
                  <td className="px-4 py-3 text-[#787774]">{a.termMonths} mo.</td>
                  <td className="px-4 py-3">
                    <Badge color={STATUS_COLOR[a.status] ?? "slate"}>{title(a.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#787774]">
                    {a.status === "APPROVED" ? (
                      loan ? (
                        <span>
                          <span className="font-medium text-[#346538]">
                            {peso(loan.remainingBalance)}
                          </span>{" "}
                          remaining · {title(loan.status)}
                          <span className="block text-xs text-[#5F5E5A]">
                            Issued {formatDate(loan.dateIssued)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[#5F5E5A]">Approved — loan being prepared</span>
                      )
                    ) : a.status === "REJECTED" ? (
                      <span>
                        {a.reviewNote || "No reason given"}
                        {a.reviewedAt && (
                          <span className="block text-xs text-[#5F5E5A]">
                            Reviewed {formatDate(a.reviewedAt)}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[#5F5E5A]">Awaiting review</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#5F5E5A]">
                  {apps.length === 0
                    ? "You have not applied for a loan yet. Apply from My Profile."
                    : `No ${title(status).toLowerCase()} loan applications.`}
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </Card>

      {filtered.length > 0 && <Pagination page={page} pageCount={pageCount} onPage={setPage} />}

      {loans.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold text-[var(--ink)]">Repayments</h2>
          <p className="mb-3 text-sm text-[var(--ink-muted)]">
            What you have paid at the cooperative office, and what is still due.
          </p>
          <div className="space-y-4">
            {loans.map((loan) => (
              <LoanRepayments key={loan.id} loan={loan} onPrint={setSlip} />
            ))}
          </div>
        </section>
      )}

      <Modal open={!!slip} onClose={() => setSlip(null)} title="Payment acknowledgment">
        {slip && <ReceiptDocument receipt={slip} />}
        <div className="no-print mt-4 flex justify-end">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={16} />
            Print
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// A member read-only view of one loan: the amortization schedule and the
// payments recorded against it. Recording and voiding are staff actions and are
// deliberately absent here.
function LoanRepayments({ loan, onPrint }) {
  const nextDue = loan.schedule.find((r) => r.status !== "PAID");
  const paid = loan.schedule.reduce((s, r) => s + Number(r.amountPaid), 0);

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-4">
        <div>
          <h3 className="font-semibold text-[var(--ink-body)]">
            {peso(loan.principalAmount)} over {loan.termMonths} months
          </h3>
          <p className="text-sm text-[var(--ink-muted)]">
            Issued {formatDate(loan.dateIssued)} &middot; {Number(loan.interestRate)}%/mo &middot; paid so far{" "}
            <span className="font-medium text-[var(--ink-body)]">{peso(paid)}</span>
          </p>
        </div>
        <div className="text-right">
          <Badge color={loan.status === "ACTIVE" ? "green" : "slate"}>{title(loan.status)}</Badge>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Balance <span className="font-semibold text-[var(--ink)]">{peso(loan.remainingBalance)}</span>
          </p>
        </div>
      </div>

      {nextDue && (
        <p className="mt-3 border-y border-[var(--line)] bg-[var(--sunken)] px-4 py-2 text-sm text-[var(--ink-body)]">
          Next due:{" "}
          <span className="font-medium">{peso(Number(nextDue.totalDue) - Number(nextDue.amountPaid))}</span> on{" "}
          {formatDate(nextDue.dueDate)} (period {nextDue.periodNo})
        </p>
      )}

      <div className="overflow-x-auto">
        <DataTable className="mt-3">
          <thead>
            <tr>
              <th>#</th>
              <th>Due date</th>
              <th className="num">Total due</th>
              <th className="num">Paid</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loan.schedule.map((r) => (
              <tr key={r.id}>
                <td className="text-[var(--ink-muted)]">{r.periodNo}</td>
                <td className="text-[var(--ink-muted)]">{formatDate(r.dueDate)}</td>
                <td className="num font-medium text-[var(--ink-body)]">{peso(r.totalDue)}</td>
                <td className="num text-[var(--ink-muted)]">{peso(r.amountPaid)}</td>
                <td>
                  <Badge color={SCHED_COLOR[r.status]}>{title(r.status)}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>

      <div className="border-t border-[var(--line)] p-4">
        <p className="mb-2 font-mono-meta text-[11px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          Payments received
        </p>
        {loan.payments.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">
            No payments recorded yet. Pay at the cooperative office and staff will record it here.
          </p>
        ) : (
          <div className="space-y-2">
            {loan.payments.map((p) => (
              <div
                key={p.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-control)] border px-3 py-2 text-sm ${
                  p.voidedAt
                    ? "border-dashed border-[var(--line-strong)] bg-[var(--sunken)]"
                    : "border-[#F2F1ED]"
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`font-medium ${
                      p.voidedAt ? "text-[var(--ink-faint)] line-through" : "text-[var(--brand)]"
                    }`}
                  >
                    {peso(p.amount)}
                  </p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {formatDate(p.paymentDate)}
                    {p.paymentNo ? ` · ${p.paymentNo}` : " · from delivery (legacy)"}
                    {p.referenceNo ? ` · ${p.referenceNo}` : ""}
                  </p>
                  {/* The reason the record was kept: a member holding the printed
                      slip finds it here, saying why it no longer counts. */}
                  {p.voidedAt && (
                    <p className="mt-0.5 text-xs font-medium text-[var(--danger)]">
                      Cancelled {formatDate(p.voidedAt)}
                      {p.voidReason ? ` · ${p.voidReason}` : ""}
                    </p>
                  )}
                </div>
                {p.paymentNo && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onPrint({ ...p, loan: { ...loan, member: loan.member } })}
                  >
                    <Printer size={14} />
                    Slip
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

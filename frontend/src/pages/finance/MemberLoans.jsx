import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import { toast } from "react-toastify";
import api, { apiError } from "../../lib/api";
import {
  Card,
  Spinner,
  PageHeader,
  Badge,
  StatCard,
  BackButton,
  DataTable,
  Modal,
  Button,
  Input,
} from "../../components/ui";
import ShowComputation from "../../components/ShowComputation";
import ReceiptDocument from "../../components/ReceiptDocument";
import { formatDate } from "../../lib/format";
import { Wallet, CalendarClock, Layers, Printer, Trash2, Plus, History } from "lucide-react";

const peso = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const SCHED_COLOR = { PAID: "green", PARTIAL: "amber", PENDING: "slate" };

const interestOf = (loan) => loan.schedule.reduce((s, r) => s + Number(r.interestDue), 0);
const outstandingOf = (row) => round2(Number(row.totalDue) - Number(row.amountPaid));

// The counter does not take token amounts. Mirrors MIN_PAYMENT in
// backend/src/modules/finance/allocate.js, which is the authority.
const MIN_PAYMENT = 200;

// The floor relaxes when a loan has less than the floor left to pay, so a small
// final remainder is still closable — a flat 200 plus the no-overpayment rule
// would otherwise leave it stuck with no valid amount at all.
function minPaymentFor(schedule, anchorPeriodNo) {
  const outstanding = round2(
    schedule
      .filter((r) => r.status !== "PAID" && r.periodNo >= anchorPeriodNo)
      .reduce((s, r) => s + outstandingOf(r), 0)
  );
  return outstanding > 0 ? Math.min(MIN_PAYMENT, outstanding) : 0;
}

// How many payments the card shows before the rest move behind the history modal.
const PAYMENTS_SHOWN = 8;

// Local date parts, not toISOString — the latter shifts the day for anyone east
// of UTC, which would date an evening payment to tomorrow.
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// A preview of where the money will land, mirroring planAllocation on the
// server (backend/src/modules/finance/allocate.js). Deliberately duplicated:
// twelve lines of arithmetic is cheaper than sharing a package between the two
// apps, and the server stays the authority — this only tells staff what to
// expect before they commit.
function previewAllocation(schedule, amount, anchorPeriodNo) {
  let remaining = round2(amount);
  const rows = [];
  const candidates = schedule
    .filter((r) => r.status !== "PAID" && r.periodNo >= anchorPeriodNo)
    .sort((a, b) => a.periodNo - b.periodNo);

  for (const r of candidates) {
    if (remaining <= 0) break;
    const need = outstandingOf(r);
    if (need <= 0) continue;
    const pay = round2(Math.min(need, remaining));
    rows.push({ periodNo: r.periodNo, amount: pay, full: pay >= need });
    remaining = round2(remaining - pay);
  }
  return { rows, unapplied: remaining };
}

// The four figures at the top are sums across every loan this member holds.
// Each one can be broken back down into the loans behind it, which is what the
// modal shows — the totals merge, the records never do.
const METRICS = {
  count: { label: "Loans", per: () => null },
  principal: { label: "Total principal", per: (l) => peso(l.principalAmount) },
  balance: { label: "Remaining balance", per: (l) => peso(l.remainingBalance) },
  interest: { label: "Total interest", per: (l) => peso(interestOf(l)) },
};

export default function MemberLoans() {
  const { memberId } = useParams();
  const [loans, setLoans] = useState(null);
  const [metric, setMetric] = useState(null);
  // { loan, row } — the installment staff clicked "Record payment" on.
  const [paying, setPaying] = useState(null);
  // The payment to show as a printable acknowledgment slip.
  const [slip, setSlip] = useState(null);

  const load = useCallback(() => {
    // The list endpoint carries no schedule, so each loan is then fetched in
    // full. A member holds one or two loans, so this stays a couple of requests.
    return api
      .get("/finance/loans", { params: { memberId } })
      .then((res) =>
        Promise.all(res.data.map((l) => api.get(`/finance/loans/${l.id}`).then((r) => r.data)))
      )
      .then(setLoans)
      .catch(() => setLoans([]));
  }, [memberId]);

  useEffect(() => {
    load();
  }, [load]);

  async function voidPayment(payment) {
    if (
      !confirm(
        `Void payment ${payment.paymentNo} of ${peso(payment.amount)}?\n\nThe installments it paid will go back to what they were before, and the loan balance will be restored. This cannot be undone.`
      )
    )
      return;
    try {
      await api.post(`/finance/loan-payments/${payment.id}/void`);
      toast.success(`Payment ${payment.paymentNo} voided`);
      await load();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  if (!loans) return <Spinner />;

  if (loans.length === 0)
    return (
      <div>
        <BackButton to="/loans" label="Back to loans" />
        <Card>
          <p className="text-[var(--ink-muted)]">This member has no loans on record.</p>
        </Card>
      </div>
    );

  const member = loans[0].member;
  const totals = {
    count: loans.length,
    principal: loans.reduce((s, l) => s + Number(l.principalAmount), 0),
    balance: loans.reduce((s, l) => s + Number(l.remainingBalance), 0),
    interest: loans.reduce((s, l) => s + interestOf(l), 0),
  };
  const active = loans.filter((l) => l.status === "ACTIVE").length;

  return (
    <div>
      <BackButton to="/loans" label="Back to loans" />
      <PageHeader
        title={`Loans — ${member.firstName} ${member.lastName}`}
        subtitle={`${member.memberNo} · ${loans.length} loan${loans.length !== 1 ? "s" : ""} on record`}
        actions={
          <Badge color={active > 0 ? "green" : "slate"}>
            {active > 0 ? `${active} active` : "None active"}
          </Badge>
        }
      />

      {/* Merged totals. Every tile opens the per-loan breakdown behind it. */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Loans"
          value={totals.count}
          hint={`${active} active`}
          icon={Layers}
          onClick={() => setMetric("count")}
        />
        <StatCard
          label="Total principal"
          value={peso(totals.principal)}
          icon={Wallet}
          onClick={() => setMetric("principal")}
        />
        <StatCard
          label="Remaining balance"
          value={peso(totals.balance)}
          icon={Wallet}
          accent="amber"
          onClick={() => setMetric("balance")}
        />
        <StatCard
          label="Total interest"
          value={peso(totals.interest)}
          icon={CalendarClock}
          accent="red"
          onClick={() => setMetric("interest")}
        />
      </div>

      {/* One section per loan — each keeps its own amortization schedule. */}
      <div className="space-y-6">
        {loans.map((loan, i) => (
          <LoanSection
            key={loan.id}
            loan={loan}
            index={i}
            onPay={(row) => setPaying({ loan, row })}
            onVoid={voidPayment}
            onPrint={setSlip}
          />
        ))}
      </div>

      <Modal
        open={!!metric}
        onClose={() => setMetric(null)}
        title={metric ? `${METRICS[metric].label} — by loan` : ""}
      >
        <div className="space-y-2">
          {loans.map((loan, i) => (
            <div
              key={loan.id}
              className="flex items-center justify-between gap-4 rounded-[var(--radius-control)] border border-[var(--line)] px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--ink-body)]">
                  Loan {i + 1} · {peso(loan.principalAmount)} over {loan.termMonths} mo
                </p>
                <p className="text-xs text-[var(--ink-muted)]">
                  Issued {formatDate(loan.dateIssued)} · {Number(loan.interestRate)}%/mo
                </p>
              </div>
              <div className="flex flex-none items-center gap-3">
                {metric && METRICS[metric].per(loan) && (
                  <span className="tabular text-sm font-semibold text-[var(--ink)]">
                    {METRICS[metric].per(loan)}
                  </span>
                )}
                <Badge color={loan.status === "ACTIVE" ? "green" : "slate"}>{loan.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Keyed by the installment: picking a different period remounts the form
          rather than syncing it in an effect. */}
      {paying && (
        <RecordPaymentModal
          key={paying.row.id}
          paying={paying}
          onClose={() => setPaying(null)}
          onRecorded={async (payment) => {
            setPaying(null);
            await load();
            setSlip(payment);
          }}
        />
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

// Staff anchor the payment to the period the member is settling; anything above
// that period's outstanding spills forward, so a member paying three months at
// once is one record rather than three.
function RecordPaymentModal({ paying, onClose, onRecorded }) {
  const { loan, row } = paying;
  // Prefilled with what this period still owes, which is what staff enter most
  // of the time; they can type over it for a partial or a lump sum.
  const [form, setForm] = useState(() => ({
    amount: String(outstandingOf(row)),
    paymentDate: today(),
    remarks: "",
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const outstanding = outstandingOf(row);
  const amount = Number(form.amount);
  const preview = amount > 0 ? previewAllocation(loan.schedule, amount, row.periodNo) : null;
  const earlierUnpaid = loan.schedule.filter((r) => r.status !== "PAID" && r.periodNo < row.periodNo);
  const minimum = minPaymentFor(loan.schedule, row.periodNo);
  const belowMinimum = amount > 0 && amount < minimum;

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!(amount > 0)) return setError("Enter the amount the member paid.");
    if (belowMinimum)
      return setError(
        minimum < MIN_PAYMENT
          ? `Only ${peso(minimum)} is left on this loan — pay exactly that to close it.`
          : `The smallest payment the cooperative accepts is ${peso(MIN_PAYMENT)}.`
      );
    if (preview?.unapplied > 0)
      return setError(
        `This loan only has ${peso(amount - preview.unapplied)} outstanding from period ${row.periodNo} onward. Enter that amount or less.`
      );

    setBusy(true);
    try {
      const res = await api.post(`/finance/loans/${loan.id}/payments`, {
        scheduleId: row.id,
        amount,
        paymentDate: form.paymentDate || null,
        remarks: form.remarks || null,
      });
      toast.success(`Payment ${res.data.paymentNo} recorded`);
      onRecorded(res.data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    // dismissible={false}: this holds a money figure someone typed, so a stray
    // backdrop click must not discard it.
    <Modal open onClose={onClose} title={`Record payment — Period ${row.periodNo}`} dismissible={false}>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <p className="rounded-[var(--radius-control)] bg-[var(--danger-tint)] px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        <div className="rounded-[var(--radius-control)] bg-[var(--sunken)] px-3 py-2.5 text-sm">
          <div className="flex justify-between text-[var(--ink-muted)]">
            <span>Due {formatDate(row.dueDate)}</span>
            <span>Total due {peso(row.totalDue)}</span>
          </div>
          <div className="mt-1 flex justify-between font-medium text-[var(--ink-body)]">
            <span>Outstanding this period</span>
            <span className="tabular">{peso(outstanding)}</span>
          </div>
        </div>

        {earlierUnpaid.length > 0 && (
          <p className="rounded-[var(--radius-control)] bg-[var(--warning-tint)] px-3 py-2 text-sm text-[var(--warning)]">
            Period {earlierUnpaid.map((r) => r.periodNo).join(", ")} {earlierUnpaid.length === 1 ? "is" : "are"} still
            unpaid and will not be touched — payment is applied from period {row.periodNo} forward. Record against the
            earliest unpaid period instead if that is what the member is settling.
          </p>
        )}

        <Input
          label="Amount received"
          type="number"
          step="0.01"
          min={minimum}
          required
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          error={belowMinimum ? `Minimum ${peso(minimum)}` : undefined}
          hint={
            minimum < MIN_PAYMENT
              ? `Only ${peso(minimum)} is left on this loan — pay exactly that to close it.`
              : `Minimum ${peso(MIN_PAYMENT)}. Anything above this period rolls into the next unpaid periods.`
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Date received"
            type="date"
            required
            value={form.paymentDate}
            onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
          />
          <Input
            label="Remarks"
            placeholder="optional"
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
          />
        </div>

        {/* The reference number is not asked for: the LP- payment number is
            generated on save and is what the slip prints as the reference. */}

        {preview && (
          <div className="rounded-[var(--radius-control)] border border-[var(--line)] px-3 py-2.5 text-sm">
            <p className="mb-1.5 font-mono-meta text-[11px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              This payment covers
            </p>
            {preview.rows.length === 0 ? (
              <p className="text-[var(--ink-muted)]">Nothing — every period from here on is already paid.</p>
            ) : (
              preview.rows.map((r) => (
                <div key={r.periodNo} className="flex justify-between py-0.5 text-[var(--ink-body)]">
                  <span>
                    Period {r.periodNo} {r.full ? "in full" : "(partial)"}
                  </span>
                  <span className="tabular">{peso(r.amount)}</span>
                </div>
              ))
            )}
            {preview.unapplied > 0 && (
              <p className="mt-1.5 border-t border-dashed border-[var(--line)] pt-1.5 text-[var(--danger)]">
                {peso(preview.unapplied)} more than this loan still owes — reduce the amount.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !(amount > 0) || belowMinimum || preview?.unapplied > 0}>
            {busy ? "Recording…" : "Record payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function LoanSection({ loan, index, onPay, onVoid, onPrint }) {
  const [showHistory, setShowHistory] = useState(false);

  // Newest first, as the API returns them. The card shows a recent window; the
  // rest stay one click away rather than turning the sidebar into a ledger.
  const payments = loan.payments;
  const recent = payments.slice(0, PAYMENTS_SHOWN);
  const hidden = payments.length - recent.length;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[var(--ink)]">
            Loan {index + 1} — {peso(loan.principalAmount)}
          </h2>
          <p className="text-sm text-[var(--ink-muted)]">
            Issued {formatDate(loan.dateIssued)} · {Number(loan.interestRate)}%/mo ·{" "}
            {loan.termMonths} months · balance{" "}
            <span className="font-medium text-[var(--ink-body)]">{peso(loan.remainingBalance)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShowComputation
            url={`/finance/loans/${loan.id}/explain`}
            label="Show formula"
            variant="secondary"
          />
          <Badge color={loan.status === "ACTIVE" ? "green" : "slate"}>{loan.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-0 lg:col-span-2">
          <h3 className="px-4 pt-4 text-sm font-semibold text-[var(--ink-body)]">
            Amortization schedule (diminishing interest)
          </h3>
          <div className="overflow-x-auto">
            <DataTable className="mt-3">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Due date</th>
                  <th className="num">Principal</th>
                  <th className="num">Interest</th>
                  <th className="num">Total due</th>
                  <th className="num">Paid</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loan.schedule.map((r) => (
                  <tr key={r.id}>
                    <td className="text-[var(--ink-muted)]">{r.periodNo}</td>
                    <td className="text-[var(--ink-muted)]">{formatDate(r.dueDate)}</td>
                    <td className="num text-[var(--ink-muted)]">{peso(r.principalDue)}</td>
                    <td className="num text-[var(--ink-muted)]">{peso(r.interestDue)}</td>
                    <td className="num font-medium text-[var(--ink-body)]">{peso(r.totalDue)}</td>
                    <td className="num text-[var(--ink-muted)]">{peso(r.amountPaid)}</td>
                    <td>
                      <Badge color={SCHED_COLOR[r.status]}>{r.status}</Badge>
                    </td>
                    <td>
                      {r.status !== "PAID" && (
                        <Button size="sm" variant="secondary" onClick={() => onPay(r)}>
                          <Plus size={14} />
                          Record payment
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--ink-body)]">Payments</h3>
            {payments.length > 0 && (
              <span className="font-mono-meta text-[11px] text-[var(--ink-muted)]">
                {payments.length} total
              </span>
            )}
          </div>
          <div className="space-y-2">
            {payments.length === 0 && (
              <p className="text-sm text-[var(--ink-muted)]">
                No payments recorded yet. Use “Record payment” on the installment the member is settling.
              </p>
            )}
            {recent.map((p) => (
              <PaymentRow key={p.id} payment={p} loan={loan} onVoid={onVoid} onPrint={onPrint} />
            ))}
          </div>

          {payments.length > 0 && (
            <Button
              variant="secondary"
              className="mt-3 w-full"
              onClick={() => setShowHistory(true)}
            >
              <History size={16} />
              See all payment history
              {hidden > 0 ? ` (${hidden} more)` : ""}
            </Button>
          )}
        </Card>
      </div>

      {/* Every payment, with the same Print and Void actions as the card. The
          list is driven by the same `loan` prop, so voiding from in here updates
          it in place once the parent reloads. */}
      <Modal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        title={`Payment history — Loan ${index + 1}`}
        wide
      >
        <p className="mb-3 text-sm text-[var(--ink-muted)]">
          {payments.length} payment{payments.length !== 1 ? "s" : ""} totalling{" "}
          <span className="font-medium text-[var(--ink-body)]">
            {peso(payments.reduce((s, p) => s + Number(p.amount), 0))}
          </span>{" "}
          against this loan.
        </p>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {payments.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">Nothing recorded yet.</p>
          ) : (
            payments.map((p) => (
              <PaymentRow
                key={p.id}
                payment={p}
                loan={loan}
                onVoid={onVoid}
                // Step out of the history before the slip opens: two stacked
                // modals with two scrims is not a place to leave someone.
                onPrint={(payment) => {
                  setShowHistory(false);
                  onPrint(payment);
                }}
              />
            ))
          )}
        </div>
      </Modal>
    </section>
  );
}

function PaymentRow({ payment, loan, onVoid, onPrint }) {
  // Rows with no paymentNo predate the manual flow: they were created by the
  // automatic delivery deduction that has since been removed. They can be read
  // but not voided or printed, because there is no stored allocation to reverse.
  const legacy = !payment.paymentNo;
  const periods = (payment.allocations ?? []).map((a) => a.periodNo);

  return (
    <div className="rounded-[var(--radius-control)] border border-[#F2F1ED] px-3 py-2 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <p className="tabular font-medium text-[var(--brand)]">{peso(payment.amount)}</p>
        <p className="font-mono-meta text-[11px] text-[var(--ink-muted)]">
          {payment.paymentNo ?? "legacy"}
        </p>
      </div>
      <p className="text-xs text-[var(--ink-muted)]">
        {formatDate(payment.paymentDate)}
        {legacy && payment.delivery ? ` · from delivery (legacy)` : ""}
        {periods.length > 0 ? ` · period ${periods.join(", ")}` : ""}
        {payment.referenceNo ? ` · ${payment.referenceNo}` : ""}
      </p>
      {payment.remarks && <p className="mt-0.5 text-xs text-[var(--ink-faint)]">{payment.remarks}</p>}
      {!legacy && (
        <div className="mt-1.5 flex gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onPrint({ ...payment, loan: { ...loan, member: loan.member } })}
          >
            <Printer size={14} />
            Print
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="hover:bg-[var(--danger-tint)] hover:text-[var(--danger)]"
            onClick={() => onVoid(payment)}
          >
            <Trash2 size={14} />
            Void
          </Button>
        </div>
      )}
    </div>
  );
}

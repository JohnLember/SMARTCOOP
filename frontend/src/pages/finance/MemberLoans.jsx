import { useEffect, useState } from "react";
import { useParams } from "react-router";
import api from "../../lib/api";
import {
  Card,
  Spinner,
  PageHeader,
  Badge,
  StatCard,
  BackButton,
  DataTable,
  Modal,
} from "../../components/ui";
import ShowComputation from "../../components/ShowComputation";
import { formatDate } from "../../lib/format";
import { Wallet, CalendarClock, Layers } from "lucide-react";

const peso = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const SCHED_COLOR = { PAID: "green", PARTIAL: "amber", PENDING: "slate" };

const interestOf = (loan) => loan.schedule.reduce((s, r) => s + Number(r.interestDue), 0);

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

  useEffect(() => {
    // The list endpoint carries no schedule, so each loan is then fetched in
    // full. A member holds one or two loans, so this stays a couple of requests.
    api
      .get("/finance/loans", { params: { memberId } })
      .then((res) =>
        Promise.all(res.data.map((l) => api.get(`/finance/loans/${l.id}`).then((r) => r.data)))
      )
      .then(setLoans)
      .catch(() => setLoans([]));
  }, [memberId]);

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
          <LoanSection key={loan.id} loan={loan} index={i} />
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
    </div>
  );
}

function LoanSection({ loan, index }) {
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
          <DataTable className="mt-3">
            <thead>
              <tr>
                <th>#</th>
                <th>Due date</th>
                <th>Principal</th>
                <th>Interest</th>
                <th>Total due</th>
                <th>Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loan.schedule.map((r) => (
                <tr key={r.id}>
                  <td className="text-[#787774]">{r.periodNo}</td>
                  <td className="text-[#787774]">{formatDate(r.dueDate)}</td>
                  <td className="text-[#787774]">{peso(r.principalDue)}</td>
                  <td className="text-[#787774]">{peso(r.interestDue)}</td>
                  <td className="font-medium text-[#2F3437]">{peso(r.totalDue)}</td>
                  <td className="text-[#787774]">{peso(r.amountPaid)}</td>
                  <td>
                    <Badge color={SCHED_COLOR[r.status]}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-[var(--ink-body)]">
            Payments (from deliveries)
          </h3>
          <div className="space-y-2">
            {loan.payments.length === 0 && (
              <p className="text-sm text-[var(--ink-muted)]">No payments deducted yet.</p>
            )}
            {loan.payments.map((p) => (
              <div
                key={p.id}
                className="rounded-[var(--radius-control)] border border-[#F2F1ED] px-3 py-2 text-sm"
              >
                <p className="font-medium text-[var(--brand)]">{peso(p.amountDeducted)}</p>
                <p className="text-xs text-[var(--ink-muted)]">
                  {formatDate(p.paymentDate)}
                  {p.delivery ? ` · ${Number(p.delivery.weightKg)}kg delivery` : ""}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

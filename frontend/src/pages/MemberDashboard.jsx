import { useEffect, useState } from "react";
import { Link } from "react-router";
import api, { apiError } from "../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { Card, Spinner, PageHeader, StatCard, Button, Input, Modal } from "../components/ui";
import { Truck, Wallet, Plus, Coins, Scale } from "lucide-react";
import ShowComputation from "../components/ShowComputation";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { monthlySummary, hasVolume, hasMoney } from "../lib/monthlySummary";

const peso = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const pesoAxis = (v) => `₱${Number(v).toLocaleString()}`;

// What the gross of a month's deliveries turned into, in the order it reads on a
// receipt: what the member took home first, then each line taken out of it.
const MONEY_SERIES = [
  { key: "net", label: "Take-home", color: "#346538" },
  { key: "cbu", label: "CBU (your savings)", color: "#B9701F" },
  { key: "dayong", label: "Dayong", color: "#1F6C9F" },
  { key: "supplies", label: "Supplies", color: "#956400" },
  { key: "membershipFee", label: "Membership fee", color: "#A3A29E" },
];

const CHART_AXIS = { tickLine: false, axisLine: false, stroke: "#A3A29E", fontSize: 12 };

export default function MemberDashboard() {
  const { user } = useAuth();
  const [member, setMember] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loanApps, setLoanApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  function reloadLoanApps() {
    api.get("/loan-applications").then((res) => setLoanApps(res.data));
  }

  useEffect(() => {
    if (!user?.memberId) return;
    Promise.all([
      api.get(`/members/${user.memberId}`),
      api.get("/production/deliveries"),
      api.get("/finance/loans"),
      api.get("/loan-applications"),
    ])
      .then(([m, d, l, la]) => {
        setMember(m.data);
        setDeliveries(d.data);
        setLoans(l.data);
        setLoanApps(la.data);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const summary = deliveries.reduce(
    (acc, d) => {
      acc.kg += Number(d.weightKg);
      acc.net += d.receipt ? Number(d.receipt.netAmount) : 0;
      acc.cbu += d.receipt ? Number(d.receipt.cbu) : 0;
      return acc;
    },
    { kg: 0, net: 0, cbu: 0 }
  );

  // A member can hold more than one approved loan at a time, so this is summed.
  const activeLoans = loans.filter((l) => l.status === "ACTIVE");
  const loanBalance = activeLoans.reduce((sum, l) => sum + Number(l.remainingBalance), 0);
  const pendingLoanApp = loanApps.find((a) => a.status === "PENDING");
  const chart = monthlySummary(deliveries);
  const hasChartData = hasVolume(chart);
  const hasMoneyData = hasMoney(chart);

  // Checked before `loading` so an unlinked account isn't left on a spinner
  // forever — there is nothing to fetch for it.
  if (!user?.memberId || (!loading && !member))
    return (
      <Card>
        <p className="text-[#787774]">
          Your account is not linked to a member record. Please contact cooperative staff.
        </p>
      </Card>
    );
  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${member.firstName}`}
        subtitle="Your deliveries, earnings and loans at a glance"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total delivered" value={`${summary.kg.toLocaleString()} kg`} icon={Scale} accent="emerald" />
        <StatCard label="Total earned" value={peso(summary.net)} icon={Coins} accent="green" />
        <StatCard label="CBU total" value={peso(summary.cbu)} icon={Wallet} accent="blue" />
        <StatCard label="Loan balance" value={peso(loanBalance)} icon={Wallet} accent="amber" />
      </div>

      <h3 className="mb-3 mt-6 font-semibold text-[#2F3437]">Activity</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/my-deliveries">
          <Card className="h-full transition hover:border-[#8FB392] hover:shadow">
            <div className="mb-2 flex items-center gap-2 text-[#346538]">
              <Truck size={20} />
              <span className="text-sm font-semibold text-[#2F3437]">Rubber deliveries</span>
            </div>
            <p className="text-2xl font-bold text-[#111111]">{summary.kg.toLocaleString()} kg</p>
            <p className="text-sm text-[#787774]">
              {deliveries.length} deliveries · {peso(summary.net)} earned
            </p>
            <p className="mt-2 text-xs font-medium text-[#346538]">View history & receipts →</p>
          </Card>
        </Link>

        <Card className="h-full">
          <div className="mb-2 flex items-center gap-2 text-amber-600">
            <Wallet size={20} />
            <span className="text-sm font-semibold text-[#2F3437]">Loan balance</span>
          </div>
          {activeLoans.length > 0 ? (
            <>
              <p className="text-2xl font-bold text-[#111111]">{peso(loanBalance)}</p>
              {activeLoans.length === 1 ? (
                <p className="text-sm text-[#787774]">
                  of {peso(activeLoans[0].principalAmount)} ·{" "}
                  {Number(activeLoans[0].interestRate)}%/mo · {activeLoans[0].termMonths} mo
                </p>
              ) : (
                <p className="text-sm text-[#787774]">across {activeLoans.length} active loans</p>
              )}
              <p className="mt-2 text-xs text-[#5F5E5A]">
                Pay at the cooperative office — staff record each payment against your schedule
              </p>
              <div className="mt-2 space-y-1">
                {activeLoans.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-2">
                    {activeLoans.length > 1 && (
                      <span className="text-xs text-[#787774]">
                        {peso(l.remainingBalance)} of {peso(l.principalAmount)} · {l.termMonths} mo
                      </span>
                    )}
                    <ShowComputation
                      url={`/finance/loans/${l.id}/explain`}
                      label={activeLoans.length > 1 ? "Amortization" : "Show amortization"}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-[#111111]">₱0.00</p>
              <p className="text-sm text-[#787774]">No active loan</p>
            </>
          )}

          <div className="mt-3 border-t border-[#F2F1ED] pt-3">
            {member.membershipType === "REGULAR" ? (
              pendingLoanApp ? (
                <p className="text-xs text-[#787774]">
                  Loan application{" "}
                  <span className="font-medium text-[#2F3437]">{pendingLoanApp.applicationNo}</span>{" "}
                  — <span className="font-medium text-amber-600">pending review</span>
                </p>
              ) : (
                <Button variant="secondary" className="w-full" onClick={() => setApplying(true)}>
                  <Plus size={16} />
                  Apply for loan
                </Button>
              )
            ) : (
              <p className="text-xs text-[#5F5E5A]">
                Only <span className="font-medium text-[#2F3437]">Regular</span> members can apply
                for a loan.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Kilos and pesos on one chart: the two halves of the same question, and
          the only place a member can see whether a heavier month actually paid
          more. Separate axes because they are different units. */}
      <h3 className="mb-3 mt-6 font-semibold text-[#2F3437]">
        Deliveries &amp; earnings — last 6 months
      </h3>
      <Card>
        {hasChartData ? (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#F2F1ED" vertical={false} />
              <XAxis dataKey="label" {...CHART_AXIS} />
              <YAxis yAxisId="kg" width={44} {...CHART_AXIS} />
              <YAxis
                yAxisId="peso"
                orientation="right"
                width={64}
                tickFormatter={pesoAxis}
                {...CHART_AXIS}
              />
              <Tooltip
                formatter={(v, name) =>
                  name === "Delivered" ? [`${Number(v).toLocaleString()} kg`, name] : [peso(v), name]
                }
              />
              <Legend />
              <Bar yAxisId="kg" dataKey="kg" name="Delivered" fill="#346538" maxBarSize={38} />
              <Line
                yAxisId="peso"
                type="monotone"
                dataKey="net"
                name="Take-home"
                stroke="#B9701F"
                strokeWidth={2}
                dot={{ r: 3, fill: "#B9701F" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-10 text-center text-sm text-[#5F5E5A]">
            No deliveries in the last 6 months yet.
          </p>
        )}
      </Card>

      {/* The counter question this page could never answer: "my gross was ₱5,000,
          why did I take home ₱4,300?". ShowComputation explains one receipt;
          this shows the pattern across months. */}
      <h3 className="mb-3 mt-6 font-semibold text-[#2F3437]">Where your delivery money went</h3>
      <Card>
        {hasMoneyData ? (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={chart}
                layout="vertical"
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid stroke="#F2F1ED" horizontal={false} />
                <XAxis type="number" tickFormatter={pesoAxis} {...CHART_AXIS} />
                <YAxis type="category" dataKey="label" width={44} {...CHART_AXIS} />
                <Tooltip formatter={(v, name) => [peso(v), name]} />
                <Legend />
                {MONEY_SERIES.map((s) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    stackId="money"
                    fill={s.color}
                    maxBarSize={26}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            {/* Said outright, because a legend alone reads every segment as a loss. */}
            <p className="mt-2 text-xs text-[#5F5E5A]">
              CBU is your own capital in the cooperative, not a fee — it builds toward Regular
              membership.
            </p>
          </>
        ) : (
          <p className="py-10 text-center text-sm text-[#5F5E5A]">
            No delivery payouts in the last 6 months yet.
          </p>
        )}
      </Card>

      <LoanApplyModal
        open={applying}
        onClose={() => setApplying(false)}
        onSubmitted={() => {
          setApplying(false);
          reloadLoanApps();
        }}
      />
    </div>
  );
}

function LoanApplyModal({ open, onClose, onSubmitted }) {
  const [form, setForm] = useState({ principalAmount: "", termMonths: "12", purpose: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ principalAmount: "", termMonths: "12", purpose: "" });
      setError("");
    }
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/loan-applications", {
        principalAmount: parseFloat(form.principalAmount),
        termMonths: parseInt(form.termMonths, 10),
        purpose: form.purpose || null,
      });
      toast.success("Loan application submitted");
      onSubmitted();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Apply for a loan">
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-[#FDEBEC] px-3 py-2 text-sm text-[#9F2F2D]">{error}</div>
        )}
        <p className="text-sm text-[#787774]">
          Cooperative staff will review your request. Interest is charged monthly on the diminishing
          balance at the rate set when your loan is approved, and repayments are paid in cash at the
          cooperative office, where staff record them against your schedule.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Amount requested (₱)"
            type="number"
            step="0.01"
            value={form.principalAmount}
            onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
            required
          />
          <Input
            label="Term (months)"
            type="number"
            value={form.termMonths}
            onChange={(e) => setForm({ ...form, termMonths: e.target.value })}
            required
          />
        </div>
        <Input
          label="Purpose (optional)"
          value={form.purpose}
          onChange={(e) => setForm({ ...form, purpose: e.target.value })}
          placeholder="e.g. farm inputs, equipment"
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit application"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

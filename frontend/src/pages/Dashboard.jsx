import { useEffect, useState } from "react";
import { Link } from "react-router";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Card, PageSkeleton, PageHeader, StatCard, EmptyState } from "../components/ui";
import { formatDate } from "../lib/format";
import { Users, UserPlus, UserCheck, FileText, FileCheck, Wallet, Boxes, ChevronRight, ChartLine } from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const peso = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const TOOLTIP_STYLE = { borderRadius: 8, borderColor: "#EAEAEA", fontSize: 13 };

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/dashboard/stats").then((res) => setStats(res.data)).catch(() => {});
  }, []);

  if (!stats) return <PageSkeleton variant="dashboard" />;

  return (
    <div>
      <PageHeader
        eyebrow="Cooperative"
        title={`Welcome back, ${user?.username ?? ""}`}
        subtitle="A snapshot of membership, applications waiting on you, and loan activity."
      />

      {/* Queues waiting on staff — highlighted first. */}
      <div className="stagger grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending membership apps" value={stats.pending.applications} icon={FileText} accent="amber" />
        <StatCard label="Pending loan apps" value={stats.pending.loanApplications} icon={FileCheck} accent="amber" />
        <StatCard label="Active loans" value={stats.loans.active} icon={Wallet} accent="blue" />
        <StatCard label="Open batches" value={stats.batches.open} icon={Boxes} accent="blue" />
      </div>

      <div className="stagger mt-4 grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Active members" value={stats.members.active} icon={Users} accent="emerald" />
        <StatCard label="Associates" value={stats.members.associates} icon={UserPlus} />
        <StatCard label="Regular members" value={stats.members.regulars} icon={UserCheck} accent="emerald" />
      </div>

      {/* Charts */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="col-span-2">
          <p className="font-mono-meta text-[11px] uppercase tracking-[0.14em] text-[#5F5E5A]">Trend</p>
          <h3 className="mt-1 mb-4 font-semibold text-[#2F3437]">Monthly rubber production (kg)</h3>
          {stats.monthlyProduction.length === 0 ? (
            <EmptyState
              icon={ChartLine}
              title="No deliveries in the last 12 months"
              hint="The trend fills in as deliveries are recorded in Loading & Deliveries."
              className="h-[240px]"
            />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={stats.monthlyProduction}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAEAEA" />
                <XAxis dataKey="month" fontSize={12} stroke="#A3A29E" />
                <YAxis fontSize={12} stroke="#A3A29E" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="totalKg" stroke="#346538" strokeWidth={2.5} dot={{ r: 3, fill: "#346538" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <p className="font-mono-meta text-[11px] uppercase tracking-[0.14em] text-[#5F5E5A]">Membership</p>
          <h3 className="mt-1 mb-4 font-semibold text-[#2F3437]">Associate vs Regular</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={[
                  { name: "Associates", value: stats.members.associates },
                  { name: "Regular", value: stats.members.regulars },
                ]}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                <Cell fill="#B9701F" />
                <Cell fill="#346538" />
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Actionable review queues */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <QueueCard
          title="Membership applications to review"
          to="/applications"
          empty="No pending membership applications."
          rows={stats.recentApplications.map((a) => ({
            id: a.id,
            primary: `${a.firstName} ${a.lastName}`,
            meta: `${a.applicationNo}${a.barangay?.name ? ` · ${a.barangay.name}` : ""}`,
            date: a.createdAt,
          }))}
        />
        <QueueCard
          title="Loan applications to review"
          to="/loan-applications"
          empty="No pending loan applications."
          rows={stats.recentLoanApplications.map((a) => ({
            id: a.id,
            primary: `${a.member.firstName} ${a.member.lastName}`,
            meta: `${a.applicationNo} · ${peso(a.principalAmount)} / ${a.termMonths} mo`,
            date: a.createdAt,
          }))}
        />
      </div>
    </div>
  );
}

// A work queue reads as one list, not a stack of cards inside a card: rows on
// hairlines, the date as quiet tabular text rather than a badge on every row.
function QueueCard({ title, to, rows, empty }) {
  return (
    <Card className="overflow-hidden p-0!">
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <h3 className="font-semibold text-[var(--ink)]">
          {title}
          {rows.length > 0 && (
            <span className="tabular ml-2 text-sm font-normal text-[var(--ink-muted)]">{rows.length}</span>
          )}
        </h3>
        <Link to={to} className="focus-ring inline-flex items-center gap-1 rounded text-sm font-medium text-[var(--brand)] hover:underline">
          View all <ChevronRight size={15} />
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 pb-5 pt-1 text-sm text-[var(--ink-muted)] sm:px-5">{empty}</p>
      ) : (
        <ul className="divide-y divide-[#F2F1ED] border-t border-[#F2F1ED]">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                to={to}
                className="focus-ring flex items-center justify-between gap-4 px-4 py-3 transition-colors duration-150 hover:bg-[var(--sunken)] sm:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--ink)]">{r.primary}</p>
                  <p className="tabular truncate text-xs text-[var(--ink-muted)]">{r.meta}</p>
                </div>
                <span className="tabular flex-none text-xs text-[var(--ink-muted)]">{formatDate(r.date)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Card, Spinner, PageHeader, StatCard, Badge } from "../components/ui";
import { formatDate } from "../lib/format";
import { Users, UserPlus, UserCheck, FileText, FileCheck, Wallet, Boxes, ChevronRight } from "lucide-react";
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

  if (!stats) return <Spinner />;

  return (
    <div>
      <PageHeader
        eyebrow="Cooperative"
        title={`Welcome back, ${user?.username ?? ""}`}
        subtitle="A snapshot of membership, applications waiting on you, and loan activity."
      />

      {/* Queues waiting on staff — highlighted first. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending membership apps" value={stats.pending.applications} icon={FileText} accent="amber" />
        <StatCard label="Pending loan apps" value={stats.pending.loanApplications} icon={FileCheck} accent="amber" />
        <StatCard label="Active loans" value={stats.loans.active} icon={Wallet} accent="blue" />
        <StatCard label="Open batches" value={stats.batches.open} icon={Boxes} accent="blue" />
      </div>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Active members" value={stats.members.active} icon={Users} accent="emerald" />
        <StatCard label="Associates" value={stats.members.associates} icon={UserPlus} />
        <StatCard label="Regular members" value={stats.members.regulars} icon={UserCheck} accent="emerald" />
      </div>

      {/* Charts */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="col-span-2">
          <p className="font-mono-meta text-[11px] uppercase tracking-[0.14em] text-[#5F5E5A]">Trend</p>
          <h3 className="mt-1 mb-4 font-semibold text-[#2F3437]">Monthly rubber production (kg)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.monthlyProduction}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAEAEA" />
              <XAxis dataKey="month" fontSize={12} stroke="#A3A29E" />
              <YAxis fontSize={12} stroke="#A3A29E" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="totalKg" stroke="#346538" strokeWidth={2.5} dot={{ r: 3, fill: "#346538" }} />
            </LineChart>
          </ResponsiveContainer>
          {stats.monthlyProduction.length === 0 && (
            <p className="mt-2 text-center text-sm text-[#5F5E5A]">No delivery data in the last 12 months.</p>
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

function QueueCard({ title, to, rows, empty }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-[#2F3437]">{title}</h3>
        <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-[#346538] hover:underline">
          View all <ChevronRight size={15} />
        </Link>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-[#5F5E5A]">{empty}</p>}
        {rows.map((r) => (
          <Link
            key={r.id}
            to={to}
            className="flex items-center justify-between rounded-lg border border-[#F2F1ED] px-3 py-2 transition hover:border-[#8FB392] hover:bg-[#EDF3EC]/40"
          >
            <div>
              <p className="text-sm font-medium text-[#2F3437]">{r.primary}</p>
              <p className="text-xs text-[#5F5E5A]">{r.meta}</p>
            </div>
            <Badge color="amber">{formatDate(r.date)}</Badge>
          </Link>
        ))}
      </div>
    </Card>
  );
}

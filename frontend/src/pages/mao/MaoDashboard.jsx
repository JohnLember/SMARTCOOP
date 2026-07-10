import { useEffect, useState } from "react";
import api, { apiError } from "../../lib/api";
import {
  Button,
  Card,
  Input,
  Select,
  Textarea,
  Spinner,
  PageHeader,
  StatCard,
  Badge,
  Modal,
} from "../../components/ui";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Scale, Users, Wallet, Boxes, Plus, AlertTriangle, Megaphone } from "lucide-react";
import { formatDate } from "../../lib/format";

const SEVERITY_COLOR = { LOW: "slate", MODERATE: "amber", HIGH: "red", CRITICAL: "red" };

export default function MaoDashboard() {
  const [stats, setStats] = useState(null);
  const [barangays, setBarangays] = useState([]);
  const [tags, setTags] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    const [s, b, t, p, m] = await Promise.all([
      api.get("/mao/stats"),
      api.get("/barangays"),
      api.get("/mao/tags"),
      api.get("/mao/programs"),
      api.get("/mao/members"),
    ]);
    setStats(s.data);
    setBarangays(b.data);
    setTags(t.data);
    setPrograms(p.data);
    setMembers(m.data);
  }

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="MAO Dashboard"
        subtitle="Municipal Agriculture Office — production monitoring & support programs"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total volume (kg)" value={stats.totalVolumeKg.toLocaleString()} icon={Scale} />
        <StatCard label="Total value (₱)" value={stats.totalValue.toLocaleString()} icon={Wallet} accent="blue" />
        <StatCard label="Deliveries" value={stats.totalDeliveries.toLocaleString()} icon={Boxes} accent="amber" />
        <StatCard label="Active members" value={stats.activeMembers} icon={Users} accent="emerald" />
      </div>

      {stats.totalDeliveries === 0 && (
        <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
          No rubber delivery data yet — production charts populate once the Production module records deliveries.
        </div>
      )}

      {/* Charts */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Card>
          <h3 className="mb-4 font-semibold text-[#2F3437]">Monthly production trend (kg)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="totalKg" stroke="#059669" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h3 className="mb-4 font-semibold text-[#2F3437]">Production by barangay (kg)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.byBarangay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="barangay" fontSize={11} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="totalKg" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Support programs + Affected areas + Announcement */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <SupportPrograms programs={programs} barangays={barangays} members={members} onChange={loadAll} />
        <div className="space-y-4">
          <AffectedAreas tags={tags} barangays={barangays} onChange={loadAll} />
          <AnnouncementComposer />
        </div>
      </div>
    </div>
  );
}

function SupportPrograms({ programs, barangays, members, onChange }) {
  const [show, setShow] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState({ name: "", type: "Fertilizer Distribution", targetBarangayId: "", budget: "" });
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/mao/programs", {
        name: form.name,
        type: form.type,
        targetBarangayId: form.targetBarangayId ? Number(form.targetBarangayId) : null,
        budget: form.budget ? Number(form.budget) : null,
      });
      setForm({ name: "", type: "Fertilizer Distribution", targetBarangayId: "", budget: "" });
      setShow(false);
      onChange();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-[#2F3437]">Support programs</h3>
        <Button variant="secondary" onClick={() => setShow((s) => !s)}>
          <Plus size={16} />
          New
        </Button>
      </div>

      {show && (
        <form onSubmit={submit} className="mb-4 space-y-3 rounded-lg bg-[#F7F6F3] p-3">
          {error && <p className="text-sm text-[#9F2F2D]">{error}</p>}
          <Input label="Program name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Target barangay" value={form.targetBarangayId} onChange={(e) => setForm({ ...form, targetBarangayId: e.target.value })}>
              <option value="">All / none</option>
              {barangays.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
            <Input label="Budget (₱)" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </div>
          <Button type="submit">Create program</Button>
        </form>
      )}

      <div className="space-y-2">
        {programs.length === 0 && <p className="text-sm text-[#B0AFAB]">No support programs yet.</p>}
        {programs.map((p) => (
          <button
            key={p.id}
            onClick={() => setOpenId(p.id)}
            className="flex w-full items-center justify-between rounded-lg border border-[#F2F1ED] px-3 py-2 text-left transition hover:border-[#8FB392] hover:bg-[#EDF3EC]/40"
          >
            <div>
              <p className="text-sm font-medium text-[#2F3437]">{p.name}</p>
              <p className="text-xs text-[#B0AFAB]">
                {p.type}
                {p.targetBarangay ? ` · ${p.targetBarangay.name}` : ""} · {p._count.recipients} recipients
              </p>
            </div>
            <Badge color={p.status === "ONGOING" ? "green" : "slate"}>{p.status}</Badge>
          </button>
        ))}
      </div>

      {openId && (
        <ProgramDetailModal
          programId={openId}
          members={members}
          onClose={() => setOpenId(null)}
          onChange={onChange}
        />
      )}
    </Card>
  );
}

const PROGRAM_STATUSES = ["PLANNED", "ONGOING", "COMPLETED", "CANCELLED"];

function ProgramDetailModal({ programId, members, onClose, onChange }) {
  const [program, setProgram] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState({ memberId: "", quantityOrAmount: "", dateDistributed: "" });

  async function load() {
    const res = await api.get(`/mao/programs/${programId}`);
    setProgram(res.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  async function updateStatus(status) {
    setBusy(true);
    setError("");
    try {
      await api.put(`/mao/programs/${programId}`, { status });
      await load();
      onChange();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function addRecipient(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post(`/mao/programs/${programId}/recipients`, {
        memberId: Number(rec.memberId),
        quantityOrAmount: rec.quantityOrAmount ? Number(rec.quantityOrAmount) : null,
        dateDistributed: rec.dateDistributed || null,
      });
      setRec({ memberId: "", quantityOrAmount: "", dateDistributed: "" });
      await load();
      onChange();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={program?.name || "Support program"} wide>
      {!program ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          {error && <p className="text-sm text-[#9F2F2D]">{error}</p>}

          <div className="flex flex-wrap items-center gap-3 text-sm text-[#787774]">
            <span>{program.type}</span>
            {program.targetBarangay && <span>· {program.targetBarangay.name}</span>}
            {program.budget != null && <span>· Budget ₱{Number(program.budget).toLocaleString()}</span>}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[#787774]">Status:</span>
            <Select value={program.status} onChange={(e) => updateStatus(e.target.value)} className="w-44" disabled={busy}>
              {PROGRAM_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>

          <div>
            <h4 className="mb-2 font-semibold text-[#2F3437]">
              Recipients ({program.recipients.length})
            </h4>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-[#F2F1ED]">
              <table className="w-full text-sm">
                <thead className="bg-[#F7F6F3] text-left text-[#787774]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Member</th>
                    <th className="px-3 py-2 font-medium">Qty / Amount</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F1ED]">
                  {program.recipients.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 text-[#2F3437]">
                        {r.member.memberNo} — {r.member.firstName} {r.member.lastName}
                      </td>
                      <td className="px-3 py-2 text-[#787774]">
                        {r.quantityOrAmount != null ? Number(r.quantityOrAmount).toLocaleString() : "—"}
                      </td>
                      <td className="px-3 py-2 text-[#787774]">
                        {formatDate(r.dateDistributed)}
                      </td>
                    </tr>
                  ))}
                  {program.recipients.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-[#B0AFAB]">
                        No recipients yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <form onSubmit={addRecipient} className="grid grid-cols-4 items-end gap-3 rounded-lg bg-[#F7F6F3] p-3">
            <div className="col-span-2">
              <Select label="Add recipient" value={rec.memberId} onChange={(e) => setRec({ ...rec, memberId: e.target.value })} required>
                <option value="">Select member…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.memberNo} — {m.firstName} {m.lastName}
                  </option>
                ))}
              </Select>
            </div>
            <Input label="Qty / Amount" type="number" step="0.01" value={rec.quantityOrAmount} onChange={(e) => setRec({ ...rec, quantityOrAmount: e.target.value })} />
            <Input label="Date" type="date" value={rec.dateDistributed} onChange={(e) => setRec({ ...rec, dateDistributed: e.target.value })} />
            <div className="col-span-4 flex justify-end">
              <Button type="submit" disabled={busy}>
                <Plus size={16} />
                Add recipient
              </Button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}

function AffectedAreas({ tags, barangays, onChange }) {
  const [form, setForm] = useState({ barangayId: "", reason: "", severity: "MODERATE" });
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/mao/tags", {
        barangayId: Number(form.barangayId),
        reason: form.reason,
        severity: form.severity,
      });
      setForm({ barangayId: "", reason: "", severity: "MODERATE" });
      onChange();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function resolve(id) {
    await api.patch(`/mao/tags/${id}/resolve`);
    onChange();
  }

  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-[#2F3437]">
        <AlertTriangle size={16} className="text-amber-500" />
        Affected areas
      </h3>
      <form onSubmit={submit} className="mb-4 space-y-3 rounded-lg bg-[#F7F6F3] p-3">
        {error && <p className="text-sm text-[#9F2F2D]">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Select label="Barangay" value={form.barangayId} onChange={(e) => setForm({ ...form, barangayId: e.target.value })} required>
            <option value="">Select…</option>
            {barangays.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
          <Select label="Severity" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            <option value="LOW">Low</option>
            <option value="MODERATE">Moderate</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </Select>
        </div>
        <Input label="Reason" placeholder="e.g. disease, typhoon damage" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
        <Button type="submit">Tag area</Button>
      </form>

      <div className="space-y-2">
        {tags.filter((t) => !t.resolvedAt).length === 0 && (
          <p className="text-sm text-[#B0AFAB]">No active affected areas.</p>
        )}
        {tags.filter((t) => !t.resolvedAt).map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-lg border border-[#F2F1ED] px-3 py-2">
            <div>
              <p className="text-sm font-medium text-[#2F3437]">{t.barangay.name}</p>
              <p className="text-xs text-[#B0AFAB]">{t.reason}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge color={SEVERITY_COLOR[t.severity]}>{t.severity}</Badge>
              <Button variant="ghost" onClick={() => resolve(t.id)}>Resolve</Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AnnouncementComposer() {
  const [form, setForm] = useState({ title: "", message: "", recipientRole: "MEMBER" });
  const [status, setStatus] = useState("");

  async function submit(e) {
    e.preventDefault();
    setStatus("");
    try {
      await api.post("/notifications", form);
      setForm({ title: "", message: "", recipientRole: "MEMBER" });
      setStatus("Announcement sent.");
    } catch (err) {
      setStatus(apiError(err));
    }
  }

  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-[#2F3437]">
        <Megaphone size={16} className="text-[#346538]" />
        Send announcement
      </h3>
      <form onSubmit={submit} className="space-y-3">
        {status && <p className="text-sm text-[#346538]">{status}</p>}
        <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <Textarea label="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
        <Select label="Audience" value={form.recipientRole} onChange={(e) => setForm({ ...form, recipientRole: e.target.value })}>
          <option value="MEMBER">All members</option>
          <option value="STAFF">Cooperative staff</option>
        </Select>
        <Button type="submit">Send</Button>
      </form>
    </Card>
  );
}

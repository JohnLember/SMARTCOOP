import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import api, { apiError } from "../../lib/api";
import { Button, Card, Input, Select, Spinner, PageHeader, Badge, RiskBadge } from "../../components/ui";
import { Plus, AlertTriangle, Search, X } from "lucide-react";

const peso = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function LoansList() {
  const [loans, setLoans] = useState(null);
  const [members, setMembers] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    memberId: "",
    principalAmount: "",
    interestRate: "5",
    termMonths: "12",
    dateIssued: "",
  });

  const [assessment, setAssessment] = useState(null);
  const [search, setSearch] = useState("");
  const [barangayId, setBarangayId] = useState("");

  async function load(overrides = {}) {
    const s = overrides.search ?? search;
    const b = overrides.barangayId ?? barangayId;
    const params = {};
    if (s) params.search = s;
    if (b) params.barangayId = b;
    const res = await api.get("/finance/loans", { params });
    setLoans(res.data);
  }

  useEffect(() => {
    api.get("/members", { params: { pageSize: 200 } }).then((res) => setMembers(res.data.items));
    api.get("/barangays").then((res) => setBarangays(res.data));
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barangayId]);

  function clearFilters() {
    setSearch("");
    setBarangayId("");
    load({ search: "", barangayId: "" });
  }

  const hasFilters = search || barangayId;

  // Fetch the selected member's latest credit assessment to inform the decision.
  useEffect(() => {
    if (!form.memberId) {
      setAssessment(null);
      return;
    }
    api
      .get(`/finance/credit-scores/${form.memberId}`)
      .then((res) => setAssessment(res.data.latest))
      .catch(() => setAssessment(null));
  }, [form.memberId]);

  // Live preview of the first installment (highest payment under diminishing interest).
  const preview = useMemo(() => {
    const p = parseFloat(form.principalAmount);
    const r = parseFloat(form.interestRate);
    const t = parseInt(form.termMonths, 10);
    if (isNaN(p) || isNaN(r) || isNaN(t) || t < 1) return null;
    const principalPer = p / t;
    const firstInterest = p * (r / 100);
    return { principalPer, firstInterest, firstTotal: principalPer + firstInterest };
  }, [form]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/finance/loans", {
        memberId: Number(form.memberId),
        principalAmount: parseFloat(form.principalAmount),
        interestRate: parseFloat(form.interestRate),
        termMonths: parseInt(form.termMonths, 10),
        dateIssued: form.dateIssued || null,
      });
      setForm({ memberId: "", principalAmount: "", interestRate: "5", termMonths: "12", dateIssued: "" });
      setShow(false);
      await load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Loans"
        subtitle="Member loans using the diminishing-interest method"
        actions={
          <Button onClick={() => setShow((s) => !s)}>
            <Plus size={16} />
            New loan
          </Button>
        }
      />

      {show && (
        <Card className="mb-4">
          <form onSubmit={submit} className="grid grid-cols-5 items-end gap-3">
            {error && <p className="col-span-5 text-sm text-[#9F2F2D]">{error}</p>}
            <Select
              label="Member"
              value={form.memberId}
              onChange={(e) => setForm({ ...form, memberId: e.target.value })}
              required
            >
              <option value="">Select…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.memberNo} — {m.firstName} {m.lastName}
                </option>
              ))}
            </Select>
            <Input label="Principal (₱)" type="number" step="0.01" value={form.principalAmount} onChange={(e) => setForm({ ...form, principalAmount: e.target.value })} required />
            <Input label="Interest %/mo" type="number" step="0.01" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} required />
            <Input label="Term (months)" type="number" value={form.termMonths} onChange={(e) => setForm({ ...form, termMonths: e.target.value })} required />
            <Input label="Date issued" type="date" value={form.dateIssued} onChange={(e) => setForm({ ...form, dateIssued: e.target.value })} />
            {preview && (
              <p className="col-span-5 rounded-lg bg-[#F7F6F3] px-3 py-2 text-sm text-[#787774]">
                First installment: <b className="text-[#346538]">{peso(preview.firstTotal)}</b>{" "}
                (principal {peso(preview.principalPer)} + interest {peso(preview.firstInterest)}). Payments
                decrease each month as the balance diminishes.
              </p>
            )}

            {/* Credit-scoring guidance for the selected member */}
            {form.memberId && (
              <div
                className={`col-span-5 rounded-lg px-3 py-2 text-sm ${
                  assessment?.factors?.riskBand === "HIGH"
                    ? "bg-[#FDEBEC] text-[#8a2725]"
                    : "bg-[#F7F6F3] text-[#787774]"
                }`}
              >
                {assessment ? (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {assessment.factors?.riskBand === "HIGH" && <AlertTriangle size={16} />}
                    <span>
                      Credit score <b>{Number(assessment.score).toFixed(1)}</b>
                    </span>
                    <RiskBadge band={assessment.factors?.riskBand} />
                    <span>{assessment.factors?.recommendation}</span>
                    <span>
                      Suggested limit:{" "}
                      <b>₱{Number(assessment.factors?.suggestedCreditLimit ?? 0).toLocaleString()}</b>
                    </span>
                  </div>
                ) : (
                  <span>
                    No credit assessment yet for this member — open their profile to “Assess credit” first.
                  </span>
                )}
              </div>
            )}

            <div className="col-span-5 flex justify-end">
              <Button type="submit">Issue loan</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="mb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-48">
            <Input
              label="Search"
              placeholder="Member No. or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Select
              label="Barangay"
              value={barangayId}
              onChange={(e) => setBarangayId(e.target.value)}
            >
              <option value="">All barangays</option>
              {barangays.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="secondary">
            <Search size={16} />
            Filter
          </Button>
          {hasFilters && (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              <X size={16} />
              Clear filter
            </Button>
          )}
        </form>
      </Card>

      {!loans ? (
        <Spinner />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F6F3] text-left text-[#787774]">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Principal</th>
                <th className="px-4 py-3 font-medium">Rate</th>
                <th className="px-4 py-3 font-medium">Term</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F1ED]">
              {loans.map((l) => (
                <tr key={l.id} className="hover:bg-[#F7F6F3]">
                  <td className="px-4 py-3">
                    <Link to={`/loans/${l.id}`} className="font-medium text-[#346538] hover:underline">
                      {l.member.memberNo} — {l.member.firstName} {l.member.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#787774]">{peso(l.principalAmount)}</td>
                  <td className="px-4 py-3 text-[#787774]">{Number(l.interestRate)}%/mo</td>
                  <td className="px-4 py-3 text-[#787774]">{l.termMonths} mo</td>
                  <td className="px-4 py-3 font-medium text-[#2F3437]">{peso(l.remainingBalance)}</td>
                  <td className="px-4 py-3">
                    <Badge color={l.status === "ACTIVE" ? "green" : "slate"}>{l.status}</Badge>
                  </td>
                </tr>
              ))}
              {loans.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#B0AFAB]">No loans yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

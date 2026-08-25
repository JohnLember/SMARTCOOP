import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import api, { apiError } from "../../lib/api";
import { toast } from "react-toastify";
import {
  Button,
  Card,
  Input,
  Select,
  Spinner,
  PageHeader,
  Badge,
  RiskBadge,
  Pagination,
  Modal,
  DataTable,
  MemberCombobox,
} from "../../components/ui";
import { usePagination } from "../../lib/usePagination";
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

  // One row per member, not per loan: a member holding two loans was listed
  // twice with no indication the two belonged together. Figures are summed here;
  // the individual loans stay separate on the member's own loans page.
  const byMember = useMemo(() => {
    const map = new Map();
    for (const l of loans ?? []) {
      const key = l.member.id;
      if (!map.has(key))
        map.set(key, { member: l.member, loans: [], principal: 0, balance: 0, active: 0 });
      const g = map.get(key);
      g.loans.push(l);
      g.principal += Number(l.principalAmount);
      g.balance += Number(l.remainingBalance);
      if (l.status === "ACTIVE") g.active += 1;
    }
    return [...map.values()];
  }, [loans]);

  const { page, setPage, pageCount, pageItems } = usePagination(loans ? byMember : null);

  async function load(overrides = {}) {
    const s = overrides.search ?? search;
    const b = overrides.barangayId ?? barangayId;
    const params = {};
    if (s) params.search = s;
    if (b) params.barangayId = b;
    const res = await api.get("/finance/loans", { params });
    setLoans(res.data);
    setPage(1);
  }

  useEffect(() => {
    // Only Regular members may be issued a loan.
    api
      .get("/members", { params: { all: 1, membershipType: "REGULAR" } })
      .then((res) => setMembers(res.data.items));
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
      toast.success("Loan issued");
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
          <Button onClick={() => setShow(true)}>
            <Plus size={16} />
            New loan
          </Button>
        }
      />

      <Modal open={show} onClose={() => setShow(false)} title="New loan" wide>
        <form onSubmit={submit} className="grid grid-cols-5 items-end gap-3">
          {error && <p className="col-span-5 text-sm text-[#9F2F2D]">{error}</p>}
            {/* Only Regular members are loaded here, but that is still a long
                list — searchable, same control as the delivery form. */}
            <MemberCombobox
              label="Member"
              members={members}
              value={form.memberId}
              onChange={(memberId) => setForm({ ...form, memberId })}
            />
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
                    No credit score yet — this member has no deliveries or loans on record to assess.
                  </span>
                )}
              </div>
            )}

          <div className="col-span-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShow(false)}>
              Cancel
            </Button>
            <Button type="submit">Issue loan</Button>
          </div>
        </form>
      </Modal>

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
              // Emptying the box is a filter change too: without this the list
              // stays filtered while "Clear filter" vanishes along with the text.
              onChange={(e) => {
                setSearch(e.target.value);
                if (!e.target.value) load({ search: "" });
              }}
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
          <DataTable>
            <thead>
              <tr>
                <th>Member</th>
                <th>Loans</th>
                <th>Total principal</th>
                <th>Total balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((g) => (
                <tr key={g.member.id}>
                  <td>
                    <Link
                      to={`/loans/member/${g.member.id}`}
                      className="font-medium text-[#346538] hover:underline"
                    >
                      {g.member.memberNo} — {g.member.firstName} {g.member.lastName}
                    </Link>
                  </td>
                  <td className="text-[#787774]">
                    {g.loans.length}
                    {g.loans.length > 1 && (
                      <span className="ml-1.5 text-xs text-[var(--ink-muted)]">merged</span>
                    )}
                  </td>
                  <td className="text-[#787774]">{peso(g.principal)}</td>
                  <td className="font-medium text-[#2F3437]">{peso(g.balance)}</td>
                  <td>
                    {/* One badge per member: how many of their loans are still running. */}
                    <Badge color={g.active > 0 ? "green" : "slate"}>
                      {g.active > 0
                        ? `${g.active} active${
                            g.loans.length > g.active ? ` · ${g.loans.length - g.active} settled` : ""
                          }`
                        : "Settled"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {byMember.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#5F5E5A]">No loans yet.</td>
                </tr>
              )}
            </tbody>
          </DataTable>
        </Card>
      )}

      {loans && <Pagination page={page} pageCount={pageCount} onPage={setPage} />}
    </div>
  );
}

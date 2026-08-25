import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import api, { apiError } from "../../lib/api";
import { toast } from "react-toastify";
import {
  Button,
  Card,
  Input,
  Spinner,
  PageHeader,
  Badge,
  StatCard,
  BackButton,
  Modal, DataTable
} from "../../components/ui";
import { Scale, Wallet, Boxes, Plus, Search, ChevronDown, ReceiptText, Printer } from "lucide-react";
import ShowComputation from "../../components/ShowComputation";
import ReceiptDocument from "../../components/ReceiptDocument";
import { formatDate } from "../../lib/format";

const STATUS_COLOR = { OPEN: "green", CLOSED: "amber", SETTLED: "slate" };
const peso = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function BatchDetail() {
  const { id } = useParams();
  const [batch, setBatch] = useState(null);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [defaults, setDefaults] = useState({ cbu: 0, membershipFee: 0, supplies: 0, dayong: 0 });
  const emptyForm = () => ({
    memberId: "",
    weightKg: "",
    drc: "",
    pricePerKg: "",
    cbu: String(defaults.cbu),
    membershipFee: String(defaults.membershipFee),
    supplies: String(defaults.supplies),
    dayong: String(defaults.dayong),
  });
  const [form, setForm] = useState({
    memberId: "", weightKg: "", drc: "", pricePerKg: "",
    cbu: "", membershipFee: "", supplies: "", dayong: "",
  });

  async function load() {
    const res = await api.get(`/production/batches/${id}`);
    setBatch(res.data);
  }

  useEffect(() => {
    load();
    // all=1: the combobox searches this list client-side, so it needs every member.
    api.get("/members", { params: { all: 1 } }).then((res) => setMembers(res.data.items));
    api.get("/production/deduction-defaults").then((res) => {
      setDefaults(res.data);
      setForm((f) => ({
        ...f,
        cbu: String(res.data.cbu),
        membershipFee: String(res.data.membershipFee),
        supplies: String(res.data.supplies),
        dayong: String(res.data.dayong),
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const previewTotal = useMemo(() => {
    const w = parseFloat(form.weightKg);
    const p = parseFloat(form.pricePerKg);
    if (isNaN(w) || isNaN(p)) return null;
    return w * p;
  }, [form.weightKg, form.pricePerKg]);

  // Net before the automatic loan deduction (loan is only known on submit).
  const previewNetBeforeLoan = useMemo(() => {
    if (previewTotal == null) return null;
    const d =
      (parseFloat(form.cbu) || 0) +
      (parseFloat(form.membershipFee) || 0) +
      (parseFloat(form.supplies) || 0) +
      (parseFloat(form.dayong) || 0);
    return previewTotal - d;
  }, [previewTotal, form.cbu, form.membershipFee, form.supplies, form.dayong]);

  async function recordDelivery(e) {
    e.preventDefault();
    if (!form.memberId) {
      setError("Select a member");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/production/deliveries", {
        memberId: Number(form.memberId),
        batchId: Number(id),
        weightKg: parseFloat(form.weightKg),
        drc: form.drc ? parseFloat(form.drc) : null,
        pricePerKg: parseFloat(form.pricePerKg),
        cbu: parseFloat(form.cbu) || 0,
        membershipFee: parseFloat(form.membershipFee) || 0,
        supplies: parseFloat(form.supplies) || 0,
        dayong: parseFloat(form.dayong) || 0,
      });
      setForm(emptyForm());
      await load();
      toast.success("Delivery recorded");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status) {
    setBusy(true);
    try {
      await api.patch(`/production/batches/${id}/status`, { status });
      await load();
      toast.success(`Batch marked ${status.toLowerCase()}`);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (!batch) return <Spinner />;
  const isOpen = batch.status === "OPEN";

  return (
    <div>
      <BackButton to="/batches" label="Back to loading batches" />
      <PageHeader
        title={`${batch.barangay.name} — ${batch.periodType}`}
        subtitle={`${formatDate(batch.startDate)} → ${formatDate(batch.endDate)}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge color={STATUS_COLOR[batch.status]}>{batch.status}</Badge>
            {batch.status === "OPEN" && (
              <Button variant="secondary" onClick={() => changeStatus("CLOSED")} disabled={busy}>
                Close batch
              </Button>
            )}
            {batch.status === "CLOSED" && (
              <>
                <Button variant="secondary" onClick={() => changeStatus("OPEN")} disabled={busy}>
                  Reopen
                </Button>
                <Button onClick={() => changeStatus("SETTLED")} disabled={busy}>
                  Mark settled
                </Button>
              </>
            )}
            {batch.status === "SETTLED" && (
              <Button variant="secondary" onClick={() => changeStatus("CLOSED")} disabled={busy}>
                Un-settle
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total volume (kg)" value={batch.totals.totalKg.toLocaleString()} icon={Scale} />
        <StatCard label="Total amount" value={peso(batch.totals.totalAmount)} icon={Wallet} accent="blue" />
        <StatCard label="Deliveries" value={batch.deliveries.length} icon={Boxes} accent="amber" />
      </div>

      {isOpen && (
        <Card className="mb-4">
          <h3 className="mb-3 font-semibold text-[#2F3437]">Record delivery</h3>
          <form onSubmit={recordDelivery} className="grid grid-cols-5 items-end gap-3">
            {error && <p className="col-span-5 text-sm text-[#9F2F2D]">{error}</p>}
            <MemberCombobox
              label="Member"
              members={members}
              value={form.memberId}
              onChange={(id) => setForm({ ...form, memberId: id })}
            />
            <Input
              label="Weight (kg)"
              type="number"
              step="0.01"
              value={form.weightKg}
              onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
              required
            />
            <Input
              label="DRC (%)"
              type="number"
              step="0.01"
              value={form.drc}
              onChange={(e) => setForm({ ...form, drc: e.target.value })}
            />
            <Input
              label="Price / kg (₱)"
              type="number"
              step="0.01"
              value={form.pricePerKg}
              onChange={(e) => setForm({ ...form, pricePerKg: e.target.value })}
              required
            />
            <div>
              <p className="mb-1 text-sm font-medium text-[#2F3437]">Gross</p>
              <div className="rounded-lg bg-[#F7F6F3] px-3 py-2 text-sm font-semibold text-[#346538]">
                {previewTotal != null ? peso(previewTotal) : "—"}
              </div>
            </div>

            {/* Net-income deductions (loan is deducted automatically) */}
            <Input
              label="CBU (₱)"
              type="number"
              step="0.01"
              value={form.cbu}
              onChange={(e) => setForm({ ...form, cbu: e.target.value })}
            />
            <Input
              label="Membership (₱)"
              type="number"
              step="0.01"
              value={form.membershipFee}
              onChange={(e) => setForm({ ...form, membershipFee: e.target.value })}
            />
            <Input
              label="Acid / Tapping Knife (₱)"
              type="number"
              step="0.01"
              value={form.supplies}
              onChange={(e) => setForm({ ...form, supplies: e.target.value })}
            />
            <Input
              label="Dayong (₱)"
              type="number"
              step="0.01"
              value={form.dayong}
              onChange={(e) => setForm({ ...form, dayong: e.target.value })}
            />
            <div>
              <p className="mb-1 text-sm font-medium text-[#2F3437]">Net (before loan)</p>
              <div className="rounded-lg bg-[#F7F6F3] px-3 py-2 text-sm font-semibold text-[#346538]">
                {previewNetBeforeLoan != null ? peso(previewNetBeforeLoan) : "—"}
              </div>
            </div>

            <p className="col-span-5 text-xs text-[#5F5E5A]">
              Any due loan installment is deducted automatically on top of these. Final net appears on the
              receipt (use “Show computation”).
            </p>

            <div className="col-span-5 flex justify-end">
              <Button type="submit" disabled={busy}>
                <Plus size={16} />
                Add delivery
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-0">
        <DataTable>
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Weight (kg)</th>
              <th className="px-4 py-3 font-medium">DRC</th>
              <th className="px-4 py-3 font-medium">Price/kg</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Net (receipt)</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {batch.deliveries.map((d) => (
              <tr key={d.id} className="hover:bg-[#F7F6F3]">
                <td className="px-4 py-3">
                  {d.member.memberNo} — {d.member.firstName} {d.member.lastName}
                </td>
                <td className="px-4 py-3 text-[#787774]">{Number(d.weightKg).toLocaleString()}</td>
                <td className="px-4 py-3 text-[#787774]">{d.drc != null ? `${d.drc}%` : "—"}</td>
                <td className="px-4 py-3 text-[#787774]">{peso(d.pricePerKg)}</td>
                <td className="px-4 py-3 font-medium text-[#2F3437]">{peso(d.totalAmount)}</td>
                <td className="px-4 py-3 text-[#346538]">{d.receipt ? peso(d.receipt.netAmount) : "—"}</td>
                <td className="px-4 py-3 text-[#787774]">{formatDate(d.deliveryDate)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <ShowReceipt delivery={d} batch={batch} />
                    <ShowComputation url={`/production/deliveries/${d.id}/explain`} label="Show computation" />
                  </div>
                </td>
              </tr>
            ))}
            {batch.deliveries.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[#5F5E5A]">
                  No deliveries recorded for this batch yet.
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </Card>
    </div>
  );
}

// The delivery's receipt, printable. Everything ReceiptDocument needs is already
// loaded with the batch, so the shape is assembled here instead of refetching:
// the receipt row carries the amounts, the delivery and member carry the rest.
function ShowReceipt({ delivery, batch }) {
  const [open, setOpen] = useState(false);
  if (!delivery.receipt) return null;

  const receipt = {
    ...delivery.receipt,
    member: delivery.member,
    delivery: { ...delivery, batch },
  };

  return (
    <>
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        <ReceiptText size={16} />
        Show Receipt
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Delivery receipt">
        <ReceiptDocument receipt={receipt} />
        <div className="no-print mt-4 flex justify-end">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={16} />
            Print
          </Button>
        </div>
      </Modal>
    </>
  );
}

// Searchable member dropdown: click to open a panel with a search box inside
// that filters by member ID or name, then click a result to select it.
function MemberCombobox({ label, members, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const selected = members.find((m) => String(m.id) === String(value));
  const q = query.trim().toLowerCase();
  const filtered = q
    ? members.filter(
        (m) =>
          m.memberNo.toLowerCase().includes(q) ||
          `${m.firstName} ${m.lastName}`.toLowerCase().includes(q)
      )
    : members;

  function pick(m) {
    onChange(String(m.id));
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative" ref={ref}>
      <span className="mb-1 block text-sm font-medium text-[#2F3437]">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="focus-ring flex w-full items-center justify-between rounded-lg border border-[#EAEAEA] bg-white px-3 py-2 text-left text-sm outline-none transition-colors focus:border-[#346538] focus:ring-1 focus:ring-[#346538]"
      >
        <span className={`truncate ${selected ? "text-[#2F3437]" : "text-[#5F5E5A]"}`}>
          {selected ? `${selected.memberNo} — ${selected.firstName} ${selected.lastName}` : "Select…"}
        </span>
        <ChevronDown size={16} className="ml-2 flex-none text-[#5F5E5A]" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-64 rounded-lg border border-[#EAEAEA] bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-[#F2F1ED] px-3 py-2">
            <Search size={15} className="flex-none text-[#5F5E5A]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
              placeholder="Search by ID or name…"
              className="w-full text-sm outline-none placeholder:text-[#5F5E5A]"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => pick(m)}
                  className={`focus-ring block w-full px-3 py-2 text-left text-sm hover:bg-[#EDF3EC] ${
                    String(m.id) === String(value)
                      ? "bg-[#EDF3EC] font-medium text-[#346538]"
                      : "text-[#2F3437]"
                  }`}
                >
                  {m.memberNo} — {m.firstName} {m.lastName}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-center text-sm text-[#5F5E5A]">No members found.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

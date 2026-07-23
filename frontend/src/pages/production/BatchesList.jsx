import { useEffect, useState } from "react";
import { Link } from "react-router";
import api, { apiError } from "../../lib/api";
import { toast } from "react-toastify";
import { Button, Card, Select, Input, Spinner, PageHeader, Badge, Modal } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { Plus, Trash2 } from "lucide-react";

const STATUS_COLOR = { OPEN: "green", CLOSED: "amber", SETTLED: "slate" };

// End date implied by the period type: Kinsina = a 15-day (inclusive) window,
// Katapusan = through the last day of the start date's month. Local-time parts
// only, so no timezone drift off the YYYY-MM-DD input value.
function computeEndDate(periodType, startDate) {
  if (!startDate) return "";
  const [y, m, d] = startDate.split("-").map(Number);
  const end = periodType === "KATAPUSAN" ? new Date(y, m, 0) : new Date(y, m - 1, d + 14);
  const pad = (n) => String(n).padStart(2, "0");
  return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
}


export default function BatchesList() {
  const [batches, setBatches] = useState(null);
  const [barangays, setBarangays] = useState([]);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    barangayId: "",
    periodType: "KINSINA",
    startDate: "",
    endDate: "",
  });

  async function load() {
    const res = await api.get("/production/batches");
    setBatches(res.data);
  }

  useEffect(() => {
    load();
    api.get("/barangays").then((res) => setBarangays(res.data));
  }, []);

  async function remove(b) {
    if (!confirm(`Delete settled batch for ${b.barangay.name}? This removes its ${b._count.deliveries} delivery record(s) and receipts. This cannot be undone.`))
      return;
    try {
      await api.delete(`/production/batches/${b.id}`);
      await load();
      toast.success("Loading batch deleted");
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/production/batches", {
        barangayId: Number(form.barangayId),
        periodType: form.periodType,
        startDate: form.startDate,
        endDate: form.endDate,
      });
      setForm({ barangayId: "", periodType: "KINSINA", startDate: "", endDate: "" });
      setShow(false);
      await load();
      toast.success("Loading batch created");
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Loading Batches"
        subtitle="Kinsina (15-day) and Katapusan (monthly) rubber collection periods"
        actions={
          <Button onClick={() => setShow(true)}>
            <Plus size={16} />
            New batch
          </Button>
        }
      />

      <Modal open={show} onClose={() => setShow(false)} title="New loading batch">
        <form onSubmit={submit} className="grid grid-cols-2 items-end gap-3">
          {error && <p className="col-span-2 text-sm text-[#9F2F2D]">{error}</p>}
            <Select
              label="Barangay"
              value={form.barangayId}
              onChange={(e) => setForm({ ...form, barangayId: e.target.value })}
              required
            >
              <option value="">Select…</option>
              {barangays.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
            <Select
              label="Period type"
              value={form.periodType}
              onChange={(e) =>
                setForm({
                  ...form,
                  periodType: e.target.value,
                  endDate: computeEndDate(e.target.value, form.startDate),
                })
              }
            >
              <option value="KINSINA">Kinsina (15-day)</option>
              <option value="KATAPUSAN">Katapusan (monthly)</option>
            </Select>
            <Input
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={(e) =>
                setForm({
                  ...form,
                  startDate: e.target.value,
                  endDate: computeEndDate(form.periodType, e.target.value),
                })
              }
              required
            />
            <Input
              label="End date (auto-filled)"
              type="date"
              value={form.endDate}
              min={computeEndDate(form.periodType, form.startDate)}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
            />
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShow(false)}>
              Cancel
            </Button>
            <Button type="submit">Create batch</Button>
          </div>
        </form>
      </Modal>

      {!batches ? (
        <Spinner />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F6F3] text-left text-[#787774]">
              <tr>
                <th className="px-4 py-3 font-medium">Barangay</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Deliveries</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F1ED]">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-[#F7F6F3]">
                  <td className="px-4 py-3">
                    <Link to={`/batches/${b.id}`} className="font-medium text-[#346538] hover:underline">
                      {b.barangay.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color="blue">{b.periodType}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#787774]">
                    {formatDate(b.startDate)} → {formatDate(b.endDate)}
                  </td>
                  <td className="px-4 py-3 text-[#787774]">{b._count.deliveries}</td>
                  <td className="px-4 py-3">
                    <Badge color={STATUS_COLOR[b.status]}>{b.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.status === "SETTLED" && (
                      <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => remove(b)}>
                        <Trash2 size={14} />
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#B0AFAB]">
                    No loading batches yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

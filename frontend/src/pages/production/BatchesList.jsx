import { useEffect, useState } from "react";
import { Link } from "react-router";
import api, { apiError } from "../../lib/api";
import { toast } from "react-toastify";
import { Button, Card, Select, Input, Spinner, PageHeader, Badge } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { Plus } from "lucide-react";

const STATUS_COLOR = { OPEN: "green", CLOSED: "amber", SETTLED: "slate" };

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
          <Button onClick={() => setShow((s) => !s)}>
            <Plus size={16} />
            New batch
          </Button>
        }
      />

      {show && (
        <Card className="mb-4">
          <form onSubmit={submit} className="grid grid-cols-4 items-end gap-3">
            {error && <p className="col-span-4 text-sm text-[#9F2F2D]">{error}</p>}
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
              onChange={(e) => setForm({ ...form, periodType: e.target.value })}
            >
              <option value="KINSINA">Kinsina (15-day)</option>
              <option value="KATAPUSAN">Katapusan (monthly)</option>
            </Select>
            <Input
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
            />
            <Input
              label="End date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
            />
            <div className="col-span-4 flex justify-end">
              <Button type="submit">Create batch</Button>
            </div>
          </form>
        </Card>
      )}

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
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#B0AFAB]">
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

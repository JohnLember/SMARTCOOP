import { useEffect, useState } from "react";
import api from "../lib/api";
import { Button, Card, Spinner, PageHeader, Badge, Modal } from "../components/ui";
import ReceiptDocument from "../components/ReceiptDocument";
import { formatDate } from "../lib/format";
import { Eye } from "lucide-react";

const peso = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MyReceipts() {
  const [receipts, setReceipts] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    // Members are auto-scoped to their own receipts by the API.
    api.get("/production/receipts").then((res) => setReceipts(res.data));
  }, []);

  if (!receipts) return <Spinner />;

  return (
    <div>
      <PageHeader title="My Receipts" subtitle="Official receipts for your rubber deliveries" />

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-[#F7F6F3] text-left text-[#787774]">
            <tr>
              <th className="px-4 py-3 font-medium">Receipt No.</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Weight</th>
              <th className="px-4 py-3 font-medium">Gross</th>
              <th className="px-4 py-3 font-medium">Net</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F1ED]">
            {receipts.map((r) => (
              <tr key={r.id} className="hover:bg-[#F7F6F3]">
                <td className="px-4 py-3 font-medium text-[#2F3437]">OR-{String(r.id).padStart(6, "0")}</td>
                <td className="px-4 py-3 text-[#787774]">{formatDate(r.dateIssued)}</td>
                <td className="px-4 py-3">
                  <Badge color="blue">{r.delivery?.batch?.periodType ?? "—"}</Badge>
                </td>
                <td className="px-4 py-3 text-[#787774]">{Number(r.delivery?.weightKg ?? 0).toLocaleString()} kg</td>
                <td className="px-4 py-3 text-[#787774]">{peso(r.grossAmount)}</td>
                <td className="px-4 py-3 font-medium text-[#346538]">{peso(r.netAmount)}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" onClick={() => setSelected(r)}>
                    <Eye size={16} />
                    View
                  </Button>
                </td>
              </tr>
            ))}
            {receipts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[#B0AFAB]">
                  No receipts yet. Receipts are generated when the cooperative records your deliveries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Receipt">
        {selected && <ReceiptDocument receipt={selected} />}
      </Modal>
    </div>
  );
}

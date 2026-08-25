import { useEffect, useState } from "react";
import api from "../lib/api";
import { Card, Spinner, PageHeader, StatCard, Badge, DataTable} from "../components/ui";
import ShowComputation from "../components/ShowComputation";
import { formatDate } from "../lib/format";
import { Scale, Wallet, Boxes } from "lucide-react";

const peso = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function MyDeliveries() {
  const [deliveries, setDeliveries] = useState(null);

  useEffect(() => {
    // Members get auto-scoped to their own deliveries by the API.
    api.get("/production/deliveries").then((res) => setDeliveries(res.data));
  }, []);

  if (!deliveries) return <Spinner />;

  const totals = deliveries.reduce(
    (acc, d) => {
      acc.kg += Number(d.weightKg);
      acc.net += d.receipt ? Number(d.receipt.netAmount) : 0;
      return acc;
    },
    { kg: 0, net: 0 }
  );

  return (
    <div>
      <PageHeader title="My Deliveries" subtitle="Your rubber delivery history and receipts" />

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total delivered (kg)" value={totals.kg.toLocaleString()} icon={Scale} />
        <StatCard label="Total earned (net)" value={peso(totals.net)} icon={Wallet} accent="blue" />
        <StatCard label="Deliveries" value={deliveries.length} icon={Boxes} accent="amber" />
      </div>

      <Card className="p-0">
        <DataTable>
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Batch</th>
              <th className="px-4 py-3 font-medium">Weight (kg)</th>
              <th className="px-4 py-3 font-medium">DRC</th>
              <th className="px-4 py-3 font-medium">Price/kg</th>
              <th className="px-4 py-3 font-medium">Gross</th>
              <th className="px-4 py-3 font-medium">Net (receipt)</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d.id} className="hover:bg-[#F7F6F3]">
                <td className="px-4 py-3 text-[#787774]">{formatDate(d.deliveryDate)}</td>
                <td className="px-4 py-3">
                  <Badge color="blue">{d.batch.periodType}</Badge>{" "}
                  <span className="text-[#787774]">{d.batch.barangay?.name}</span>
                </td>
                <td className="px-4 py-3 text-[#787774]">{Number(d.weightKg).toLocaleString()}</td>
                <td className="px-4 py-3 text-[#787774]">{d.drc != null ? `${d.drc}%` : "—"}</td>
                <td className="px-4 py-3 text-[#787774]">{peso(d.pricePerKg)}</td>
                <td className="px-4 py-3 text-[#787774]">{peso(d.totalAmount)}</td>
                <td className="px-4 py-3 font-medium text-[#346538]">
                  {d.receipt ? peso(d.receipt.netAmount) : "—"}
                </td>
                <td className="px-4 py-3">
                  <ShowComputation url={`/production/deliveries/${d.id}/explain`} label="Show computation" />
                </td>
              </tr>
            ))}
            {deliveries.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[#5F5E5A]">
                  No deliveries recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </Card>
    </div>
  );
}

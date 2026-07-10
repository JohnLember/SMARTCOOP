import { useEffect, useState } from "react";
import api, { apiError } from "../../lib/api";
import { Button, Card, Input, Spinner, PageHeader, StatCard } from "../../components/ui";
import ShowComputation from "../../components/ShowComputation";
import { formatDate } from "../../lib/format";
import { Coins, HandCoins, Users, Calculator } from "lucide-react";

const peso = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function Settlements() {
  const thisYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(thisYear);
  const [dividendPool, setDividendPool] = useState("");
  const [patronagePool, setPatronagePool] = useState("");
  const [rows, setRows] = useState([]);
  const [loadedYear, setLoadedYear] = useState(thisYear);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadYear(year) {
    setLoading(true);
    try {
      const res = await api.get("/finance/settlements", { params: { fiscalYear: year } });
      setRows(res.data);
      setLoadedYear(Number(year));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadYear(fiscalYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function compute(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/finance/settlements/compute", {
        fiscalYear: Number(fiscalYear),
        dividendPool: parseFloat(dividendPool) || 0,
        patronagePool: parseFloat(patronagePool) || 0,
      });
      setSummary(res.data);
      await loadYear(fiscalYear);
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Settlements"
        subtitle="Dividends (by share capital) and patronage refunds (by delivery volume)"
      />

      <Card className="mb-4">
        <form onSubmit={compute} className="grid grid-cols-4 items-end gap-3">
          {error && <p className="col-span-4 text-sm text-[#9F2F2D]">{error}</p>}
          <Input label="Fiscal year" type="number" value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} required />
          <Input label="Dividend pool (₱)" type="number" step="0.01" value={dividendPool} onChange={(e) => setDividendPool(e.target.value)} placeholder="e.g. 100000" />
          <Input label="Patronage pool (₱)" type="number" step="0.01" value={patronagePool} onChange={(e) => setPatronagePool(e.target.value)} placeholder="e.g. 80000" />
          <Button type="submit">
            <Calculator size={16} />
            Compute & distribute
          </Button>
          <p className="col-span-4 text-xs text-[#B0AFAB]">
            Recomputing a year replaces that year's settlements. Dividends are allocated pro-rata by share
            capital; patronage refunds pro-rata by each member's rubber delivery volume (kg) for the year.
          </p>
        </form>
      </Card>

      {summary && (
        <div className="mb-4 grid grid-cols-4 gap-4">
          <StatCard label="Members" value={summary.members} icon={Users} />
          <StatCard label="Total dividends" value={peso(summary.totalDividend)} icon={Coins} accent="blue" />
          <StatCard label="Total patronage" value={peso(summary.totalPatronage)} icon={HandCoins} accent="amber" />
          <StatCard label="Total volume (kg)" value={summary.totalVolumeKg.toLocaleString()} icon={Calculator} />
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F6F3] text-left text-[#787774]">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Dividend</th>
                <th className="px-4 py-3 font-medium">Patronage refund</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Date paid</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F1ED]">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-[#F7F6F3]">
                  <td className="px-4 py-3 text-[#2F3437]">
                    {s.member.memberNo} — {s.member.firstName} {s.member.lastName}
                  </td>
                  <td className="px-4 py-3 text-[#787774]">{peso(s.dividend)}</td>
                  <td className="px-4 py-3 text-[#787774]">{peso(s.patronageRefund)}</td>
                  <td className="px-4 py-3 font-medium text-[#346538]">{peso(s.totalAmount)}</td>
                  <td className="px-4 py-3 text-[#787774]">{formatDate(s.datePaid)}</td>
                  <td className="px-4 py-3 text-left">
                    <ShowComputation
                      url={`/finance/settlements/explain?memberId=${s.memberId}&fiscalYear=${loadedYear}`}
                      label="Show computation"
                    />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#B0AFAB]">
                    No settlements for {fiscalYear} yet. Enter the pools above and compute.
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

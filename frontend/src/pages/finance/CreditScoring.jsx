import { useEffect, useState } from "react";
import { Link } from "react-router";
import api, { apiError } from "../../lib/api";
import { toast } from "react-toastify";
import { Button, Card, Spinner, PageHeader, RiskBadge, StatCard, Pagination, DataTable} from "../../components/ui";
import ShowComputation from "../../components/ShowComputation";
import { formatDate } from "../../lib/format";
import { usePagination } from "../../lib/usePagination";
import { RefreshCw, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

export default function CreditScoring() {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const { page, setPage, pageCount, pageItems } = usePagination(rows);

  async function load() {
    const res = await api.get("/finance/credit-scores");
    setRows(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function computeAll() {
    setBusy(true);
    try {
      const res = await api.post("/finance/credit-scores/compute-all");
      await load();
      toast.success(`Computed ${res.data?.evaluated ?? "all"} credit scores`);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function recompute(memberId) {
    setBusy(true);
    try {
      await api.post(`/finance/credit-scores/${memberId}/compute`);
      await load();
      toast.success("Credit score recomputed");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (!rows) return <Spinner />;

  const counts = rows.reduce(
    (acc, r) => {
      const band = r.creditScore?.factors?.riskBand;
      if (band === "LOW") acc.low += 1;
      else if (band === "MEDIUM") acc.medium += 1;
      else if (band === "HIGH") acc.high += 1;
      return acc;
    },
    { low: 0, medium: 0, high: 0 }
  );

  return (
    <div>
      <PageHeader
        title="Agricultural Credit Scoring"
        subtitle="Algorithmic creditworthiness from repayment history, production consistency, and cooperative standing"
        actions={
          <Button onClick={computeAll} disabled={busy}>
            <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
            Compute all
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Low risk" value={counts.low} icon={ShieldCheck} accent="emerald" />
        <StatCard label="Medium risk" value={counts.medium} icon={ShieldAlert} accent="amber" />
        <StatCard label="High risk" value={counts.high} icon={ShieldX} accent="red" />
      </div>

      <Card className="p-0">
        <DataTable>
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium">Suggested limit</th>
              <th className="px-4 py-3 font-medium">Assessed</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((r) => (
              <tr key={r.id} className="hover:bg-[#F7F6F3]">
                <td className="px-4 py-3">
                  <Link to={`/members/${r.id}`} className="font-medium text-[#346538] hover:underline">
                    {r.memberNo} — {r.firstName} {r.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 font-semibold text-[#2F3437]">
                  {r.creditScore ? Number(r.creditScore.score).toFixed(1) : "—"}
                </td>
                <td className="px-4 py-3">
                  <RiskBadge band={r.creditScore?.factors?.riskBand} />
                </td>
                <td className="px-4 py-3 text-[#787774]">
                  {r.creditScore?.factors?.suggestedCreditLimit != null
                    ? `₱${Number(r.creditScore.factors.suggestedCreditLimit).toLocaleString()}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-[#787774]">
                  {r.creditScore ? formatDate(r.creditScore.computedAt) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {r.creditScore && (
                      <ShowComputation url={`/finance/credit-scores/${r.id}/explain`} label="Show computation" />
                    )}
                    <Button variant="ghost" onClick={() => recompute(r.id)} disabled={busy}>
                      Recompute
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Card>

      <Pagination page={page} pageCount={pageCount} onPage={setPage} />
    </div>
  );
}

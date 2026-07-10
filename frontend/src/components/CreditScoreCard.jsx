import { useEffect, useState } from "react";
import api, { apiError } from "../lib/api";
import { Button, Card, RiskBadge } from "./ui";
import ShowComputation from "./ShowComputation";
import { formatDate } from "../lib/format";
import { RefreshCw } from "lucide-react";

const peso = (n) => `₱${Number(n).toLocaleString()}`;

// Shows a member's latest credit score with factor breakdown. If `canCompute`,
// staff can (re)compute it. Calls onComputed after a successful compute.
export default function CreditScoreCard({ memberId, canCompute = false, onComputed }) {
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/finance/credit-scores/${memberId}`);
      setLatest(res.data.latest);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  async function compute() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/finance/credit-scores/${memberId}/compute`);
      await load();
      onComputed?.();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  const f = latest?.factors;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-[#2F3437]">Credit score</h3>
        <RiskBadge band={f?.riskBand} />
      </div>

      {error && <p className="mb-2 text-sm text-[#9F2F2D]">{error}</p>}

      {loading ? (
        <p className="text-sm text-[#B0AFAB]">Loading…</p>
      ) : latest ? (
        <>
          <p className="text-3xl font-bold text-[#346538]">{Number(latest.score).toFixed(1)}</p>
          <p className="mb-3 text-sm text-[#787774]">{f?.recommendation}</p>
          <div className="space-y-1 rounded-lg bg-[#F7F6F3] p-3 text-xs text-[#787774]">
            <Row label="Repayment history" value={f?.repaymentScore} />
            <Row label="Production consistency" value={f?.productionScore} />
            <Row label="Farm characteristics" value={f?.farmScore} />
            <div className="my-1 border-t border-[#EAEAEA]" />
            <p>On-time installments: {f?.paidOnTime}/{f?.dueInstallments}{f?.overdueInstallments ? ` (${f.overdueInstallments} overdue)` : ""}</p>
            <p>12-mo volume: {f?.totalVolumeKg} kg across {f?.activeMonths} month(s)</p>
            <p>Outstanding loan balance: {peso(f?.outstandingBalance ?? 0)}</p>
            <p className="font-medium text-[#2F3437]">Suggested credit limit: {peso(f?.suggestedCreditLimit ?? 0)}</p>
          </div>
          <p className="mt-2 text-xs text-[#B0AFAB]">Assessed {formatDate(latest.computedAt)}</p>
          <div className="mt-2">
            <ShowComputation
              url={`/finance/credit-scores/${memberId}/explain`}
              label="Show computation"
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-[#B0AFAB]">Not yet assessed.</p>
      )}

      {canCompute && (
        <Button variant="secondary" className="mt-3 w-full" onClick={compute} disabled={busy}>
          <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
          {latest ? "Recompute score" : "Assess credit"}
        </Button>
      )}
    </Card>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="font-medium text-[#2F3437]">{value != null ? Number(value).toFixed(0) : "—"}</span>
    </div>
  );
}

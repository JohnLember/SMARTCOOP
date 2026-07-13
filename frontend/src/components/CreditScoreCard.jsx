import { useEffect, useState } from "react";
import api, { apiError } from "../lib/api";
import { Button, Card, RiskBadge, Modal } from "./ui";
import ShowComputation from "./ShowComputation";
import { formatDate } from "../lib/format";
import { RefreshCw, AlertTriangle, TrendingUp } from "lucide-react";

const peso = (n) => `₱${Number(n).toLocaleString()}`;

// Shows a member's latest credit score with factor breakdown. If `canCompute`,
// staff can (re)compute it. Calls onComputed after a successful compute.
export default function CreditScoreCard({ memberId, canCompute = false, onComputed }) {
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showGuide, setShowGuide] = useState(false);

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

          {f?.riskBand === "HIGH" && (
            <div className="mb-3 rounded-lg border border-[#F6D9DA] bg-[#FDEBEC] p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 flex-none text-[#9F2F2D]" />
                <div>
                  <p className="text-sm font-medium text-[#8a2725]">
                    Your credit score is High Risk
                  </p>
                  <p className="mt-0.5 text-xs text-[#9F2F2D]">
                    A high-risk score can limit loan approvals and your suggested credit limit. It
                    can be improved over time.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowGuide(true)}
                    className="btn-press mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#F6D9DA] bg-white px-3 py-1.5 text-xs font-medium text-[#8a2725] hover:bg-[#FDEBEC]"
                  >
                    <TrendingUp size={14} />
                    How to improve my score
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-1 rounded-lg bg-[#F7F6F3] p-3 text-xs text-[#787774]">
            <Row label="Repayment history" value={f?.repaymentScore} />
            <Row label="Production consistency" value={f?.productionScore} />
            <Row label="Cooperative standing" value={f?.farmScore} />
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

      <CreditGuideModal open={showGuide} onClose={() => setShowGuide(false)} />
    </Card>
  );
}

// Actionable guide mapping each scoring pillar to what a member can do to raise it.
const GUIDE = [
  {
    title: "Repayment history",
    weight: "Biggest factor",
    tips: [
      "Pay every loan installment on or before its due date.",
      "Clear any overdue balances as soon as you can.",
      "Fully repay active loans — each loan closed in good standing raises your score.",
    ],
  },
  {
    title: "Production consistency",
    tips: [
      "Deliver your rubber every month rather than in one large batch.",
      "Increase the total volume (kg) you deliver over the year.",
      "Keep delivering regularly — steady activity counts more than one big drop-off.",
    ],
  },
  {
    title: "Cooperative standing",
    tips: [
      "Grow your share capital and let your CBU (Capital Build-Up) accumulate.",
      "Stay an active member — longer membership tenure improves your standing.",
      "Reach Regular membership (CBU or savings of ₱10,000) for the highest standing.",
    ],
  },
];

function CreditGuideModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="How to improve your credit score">
      <div className="space-y-4">
        <p className="text-sm text-[#787774]">
          Your credit score is built from three parts. Improving any of them raises your score and
          your suggested credit limit over time.
        </p>
        {GUIDE.map((section) => (
          <div key={section.title} className="rounded-lg border border-[#EAEAEA] p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-semibold text-[#2F3437]">{section.title}</h4>
              {section.weight && (
                <span className="rounded-full bg-[#EDF3EC] px-2.5 py-0.5 text-xs font-medium text-[#346538]">
                  {section.weight}
                </span>
              )}
            </div>
            <ul className="space-y-1.5">
              {section.tips.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-sm text-[#787774]">
                  <TrendingUp size={14} className="mt-0.5 flex-none text-[#346538]" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="flex justify-end">
          <Button onClick={onClose}>Got it</Button>
        </div>
      </div>
    </Modal>
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

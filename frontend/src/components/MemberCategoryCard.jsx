import { useState } from "react";
import api, { apiError } from "../lib/api";
import { toast } from "react-toastify";
import { Button, Card, CategoryBadge, Modal } from "./ui";
import ShowComputation from "./ShowComputation";
import { formatDate } from "../lib/format";
import { RefreshCw, AlertTriangle, TrendingUp } from "lucide-react";

// Shows a member's Dynamic Member Categorization (Active/Moderate/Inactive/N-A)
// with score breakdown, plus a guide on how to reach Active when they haven't.
// If `canRecategorize`, staff can recompute it live (calls onRecategorized with
// the updated member fields).
export default function MemberCategoryCard({ member, canRecategorize = false, onRecategorized }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  async function recategorize() {
    setBusy(true);
    setError("");
    try {
      const res = await api.post(`/members/${member.id}/evaluate`);
      toast.success("Member re-categorized");
      onRecategorized?.(res.data.member);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  const category = member.activityCategory;
  const needsGuide = category === "MODERATE" || category === "INACTIVE" || category === "NOT_APPLICABLE";
  // Associates can't take a loan, so the Loan Score pillar doesn't apply to them
  // — they're scored on delivery alone. Guidance adapts to avoid promising an
  // unreachable 50 loan points.
  const isAssociate = member.membershipType === "ASSOCIATE";

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-[#2F3437]">Member category</h3>
        <CategoryBadge category={category} />
      </div>

      {error && <p className="mb-2 text-sm text-[#9F2F2D]">{error}</p>}

      <p className="text-xs text-[#5F5E5A]">Activity score</p>
      <p className="mb-3 text-3xl font-bold text-[#346538]">
        {member.activityScore != null ? member.activityScore : "—"}
      </p>
      <div className="mb-3 space-y-1 rounded-lg bg-[#F7F6F3] p-3 text-xs text-[#787774]">
        <div className="flex justify-between">
          <span>Delivery Score (DS)</span>
          <span className="font-medium text-[#2F3437]">{member.deliveryScore ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span>Loan Score (LS){isAssociate ? " — not available for associates" : ""}</span>
          <span className="font-medium text-[#2F3437]">{member.loanScore ?? "N/A"}</span>
        </div>
        <div className="flex justify-between">
          <span>Repayment Rate (RR)</span>
          <span className="font-medium text-[#2F3437]">
            {member.repaymentRate != null ? `${Number(member.repaymentRate)}%` : "N/A"}
          </span>
        </div>
      </div>

      {needsGuide && (
        <div className="mb-3 rounded-lg border border-[#F6D9DA] bg-[#FDEBEC] p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 flex-none text-[#9F2F2D]" />
            <div>
              <p className="text-sm font-medium text-[#8a2725]">
                {category === "NOT_APPLICABLE"
                  ? "Not yet rated Active"
                  : `Category is ${category === "MODERATE" ? "Moderate" : "Inactive"}`}
              </p>
              <p className="mt-0.5 text-xs text-[#9F2F2D]">
                {category === "NOT_APPLICABLE"
                  ? isAssociate
                    ? "No deliveries in the last 30 days, so there's nothing to score this period."
                    : "No deliveries in the last 30 days and no loan on record, so there's nothing to score this period."
                  : isAssociate
                    ? "Delivering more rubber can raise this to Active."
                    : "Delivering more and staying current on loan payments can raise this to Active."}
              </p>
              <button
                type="button"
                onClick={() => setShowGuide(true)}
                className="focus-ring btn-press mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#F6D9DA] bg-white px-3 py-1.5 text-xs font-medium text-[#8a2725] hover:bg-[#FDEBEC]"
              >
                <TrendingUp size={14} />
                How to become Active
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {canRecategorize && (
          <Button variant="secondary" className="w-full" onClick={recategorize} disabled={busy}>
            <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
            Re-categorize
          </Button>
        )}
        <ShowComputation
          url={`/members/${member.id}/progression/explain`}
          label="Show computation"
          className="w-full"
        />
      </div>
      {member.lastCategorizedAt && (
        <p className="mt-2 text-xs text-[#5F5E5A]">
          Last categorized {formatDate(member.lastCategorizedAt)}
        </p>
      )}

      <CategoryGuideModal open={showGuide} onClose={() => setShowGuide(false)} isAssociate={isAssociate} />
    </Card>
  );
}

// Maps the categorization algorithm's point thresholds to actionable advice.
// Associates can't take a loan, so their guide is delivery-only.
const DELIVERY_SECTION = {
  title: "Delivery Score — up to 50 pts",
  tips: [
    "Deliver at least 300 kg of rubber within the last 30 days for the full 50 points.",
    "100–299 kg earns 30 points; under 100 kg earns only 10.",
    "Deliver regularly across loading periods rather than skipping months.",
  ],
};

function buildGuide(isAssociate) {
  if (isAssociate) {
    return [
      DELIVERY_SECTION,
      {
        title: "Loan Score — not available yet",
        tips: [
          "Associate members can't take a loan, so loan points aren't counted for you.",
          "You become a Regular member once your CBU reaches ₱10,000 — then loan repayments start counting.",
          "Until then, you're scored on delivery alone.",
        ],
      },
      {
        title: "Reaching Active — deliver 300 kg+",
        tips: [
          "As an associate you're scored on delivery alone (rescaled to a 100-point scale).",
          "Deliver 300 kg+ of rubber within 30 days to reach Active.",
          "100–299 kg reaches Moderate; under 100 kg stays Inactive.",
          "Once you're a Regular member with a loan, on-time repayments add a second way to raise your score.",
        ],
      },
    ];
  }
  return [
    DELIVERY_SECTION,
    {
      title: "Loan Score — up to 50 pts",
      tips: [
        "Pay every loan installment on or before its due date.",
        "A repayment rate (paid ÷ due) of 90%+ earns the full 50 points; 70–89% earns 30.",
        "No loan yet? You're scored on delivery alone — deliver 300 kg+ in 30 days to reach Active without a loan.",
      ],
    },
    {
      title: "Reaching Active — score of 80 or higher",
      tips: [
        "≥300 kg delivered plus a repayment rate of 70%+ reaches Active.",
        "100–299 kg delivered plus a repayment rate of 90%+ also reaches Active.",
        "No loan (associate)? 300 kg+ delivered alone reaches Active.",
        "The more you deliver and the more current your payments, the further above 80 your score climbs.",
      ],
    },
  ];
}

function CategoryGuideModal({ open, onClose, isAssociate }) {
  return (
    <Modal open={open} onClose={onClose} title="How to become Active">
      <div className="space-y-4">
        <p className="text-sm text-[#787774]">
          {isAssociate
            ? "As an associate you're scored on delivery alone. Deliver 300 kg+ within 30 days to become Active — loan points don't apply until you're a Regular member."
            : "Activity Score = Delivery Score + Loan Score. Reaching 80 or higher makes you Active."}
        </p>
        {buildGuide(isAssociate).map((section) => (
          <div key={section.title} className="rounded-lg border border-[#EAEAEA] p-3">
            <h4 className="mb-2 font-semibold text-[#2F3437]">{section.title}</h4>
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

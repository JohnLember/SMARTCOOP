import { useEffect, useState } from "react";
import { Link } from "react-router";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  Card,
  Spinner,
  PageHeader,
  MembershipBadge,
  CategoryBadge,
  Badge,
} from "../components/ui";
import { Truck, Wallet } from "lucide-react";
import CreditScoreCard from "../components/CreditScoreCard";
import ShowComputation from "../components/ShowComputation";
import { formatDate } from "../lib/format";

const peso = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-[#B0AFAB]">{label}</p>
      <p className="text-sm font-medium text-[#2F3437]">{value ?? "—"}</p>
    </div>
  );
}

export default function MemberSelfView() {
  const { user } = useAuth();
  const [member, setMember] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.memberId) {
      setLoading(false);
      return;
    }
    Promise.all([
      api.get(`/members/${user.memberId}`),
      api.get("/production/deliveries"),
      api.get("/finance/loans"),
    ])
      .then(([m, d, l]) => {
        setMember(m.data);
        setDeliveries(d.data);
        setLoans(l.data);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const deliverySummary = deliveries.reduce(
    (acc, d) => {
      acc.kg += Number(d.weightKg);
      acc.net += d.receipt ? Number(d.receipt.netAmount) : 0;
      return acc;
    },
    { kg: 0, net: 0 }
  );

  const activeLoan = loans.find((l) => l.status === "ACTIVE");

  if (loading) return <Spinner />;
  if (!member)
    return (
      <Card>
        <p className="text-[#787774]">
          Your account is not linked to a member record. Please contact cooperative staff.
        </p>
      </Card>
    );

  return (
    <div>
      <PageHeader title="My Profile" subtitle={member.memberNo} />

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <h3 className="mb-4 font-semibold text-[#2F3437]">
            {member.firstName} {member.lastName}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Membership" value={<MembershipBadge type={member.membershipType} />} />
            <Field label="Status" value={<Badge color={member.status === "ACTIVE" ? "green" : "slate"}>{member.status}</Badge>} />
            <Field label="Barangay" value={member.barangay?.name} />
            <Field label="Contact" value={member.contactNo} />
            <Field label="Share capital" value={`₱${Number(member.shareCapital).toLocaleString()}`} />
            <Field label="Date joined" value={formatDate(member.dateJoined)} />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-[#2F3437]">Member category</h3>
              <CategoryBadge category={member.activityCategory} />
            </div>
            <p className="text-xs text-[#B0AFAB]">Activity score</p>
            <p className="mb-3 text-3xl font-bold text-[#346538]">
              {member.activityScore != null ? member.activityScore : "—"}
            </p>
            <div className="mb-3 space-y-1 text-xs text-[#787774]">
              <div className="flex justify-between">
                <span>Delivery Score</span>
                <span className="font-medium text-[#2F3437]">{member.deliveryScore ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Loan Score</span>
                <span className="font-medium text-[#2F3437]">{member.loanScore ?? "N/A"}</span>
              </div>
            </div>
            <ShowComputation
              url={`/members/${member.id}/progression/explain`}
              label="Show computation"
            />
          </Card>

          <CreditScoreCard memberId={member.id} />
        </div>
      </div>

      <h3 className="mb-3 mt-6 font-semibold text-[#2F3437]">Activity</h3>
      <div className="grid grid-cols-2 gap-4">
        <Link to="/my-deliveries">
          <Card className="h-full transition hover:border-[#8FB392] hover:shadow">
            <div className="mb-2 flex items-center gap-2 text-[#346538]">
              <Truck size={20} />
              <span className="text-sm font-semibold text-[#2F3437]">Rubber deliveries</span>
            </div>
            <p className="text-2xl font-bold text-[#111111]">{deliverySummary.kg.toLocaleString()} kg</p>
            <p className="text-sm text-[#787774]">
              {deliveries.length} deliveries · {peso(deliverySummary.net)} earned
            </p>
            <p className="mt-2 text-xs font-medium text-[#346538]">View history & receipts →</p>
          </Card>
        </Link>
        <Card className="h-full">
          <div className="mb-2 flex items-center gap-2 text-amber-600">
            <Wallet size={20} />
            <span className="text-sm font-semibold text-[#2F3437]">Loan balance</span>
          </div>
          {activeLoan ? (
            <>
              <p className="text-2xl font-bold text-[#111111]">{peso(activeLoan.remainingBalance)}</p>
              <p className="text-sm text-[#787774]">
                of {peso(activeLoan.principalAmount)} · {Number(activeLoan.interestRate)}%/mo ·{" "}
                {activeLoan.termMonths} mo
              </p>
              <p className="mt-2 text-xs text-[#B0AFAB]">Auto-deducted from your deliveries</p>
              <div className="mt-2">
                <ShowComputation
                  url={`/finance/loans/${activeLoan.id}/explain`}
                  label="Show amortization"
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-[#111111]">₱0.00</p>
              <p className="text-sm text-[#787774]">No active loan</p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

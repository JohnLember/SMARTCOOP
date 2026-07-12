import { useEffect, useState } from "react";
import { Link } from "react-router";
import api, { apiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  Card,
  Spinner,
  PageHeader,
  MembershipBadge,
  CategoryBadge,
  Badge,
  Button,
  Input,
  Select,
  Modal,
} from "../components/ui";
import { Truck, Wallet, Pencil } from "lucide-react";
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
  const [editing, setEditing] = useState(false);

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
      <PageHeader
        title="My Profile"
        subtitle={member.memberNo}
        actions={
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil size={16} />
            Edit profile
          </Button>
        }
      />

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

      <EditProfileModal
        open={editing}
        member={member}
        onClose={() => setEditing(false)}
        onSaved={(updated) => {
          setMember((m) => ({ ...m, ...updated }));
          setEditing(false);
        }}
      />
    </div>
  );
}

function EditProfileModal({ open, member, onClose, onSaved }) {
  const [barangays, setBarangays] = useState([]);
  const [form, setForm] = useState({ sex: "", birthdate: "", address: "", barangayId: "", contactNo: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      api.get("/barangays").then((res) => setBarangays(res.data));
      setForm({
        sex: member.sex ?? "",
        birthdate: member.birthdate ? member.birthdate.slice(0, 10) : "",
        address: member.address ?? "",
        barangayId: member.barangayId ?? "",
        contactNo: member.contactNo ?? "",
      });
      setError("");
    }
  }, [open, member]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...form,
        birthdate: form.birthdate || null,
        barangayId: form.barangayId ? Number(form.barangayId) : null,
      };
      const res = await api.put(`/members/${member.id}/profile`, payload);
      onSaved(res.data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit profile">
      <form onSubmit={save} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-[#FDEBEC] px-3 py-2 text-sm text-[#9F2F2D]">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Select label="Sex" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
            <option value="">—</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </Select>
          <Input
            label="Birthdate"
            type="date"
            value={form.birthdate}
            onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
          />
          <Input
            label="Contact no."
            value={form.contactNo}
            onChange={(e) => setForm({ ...form, contactNo: e.target.value })}
          />
          <Select
            label="Barangay"
            value={form.barangayId}
            onChange={(e) => setForm({ ...form, barangayId: e.target.value })}
          >
            <option value="">—</option>
            {barangays.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
        </div>
        <Input
          label="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import api, { apiError } from "../../lib/api";
import {
  Button,
  Card,
  Input,
  Select,
  Spinner,
  PageHeader,
  MembershipBadge,
  CategoryBadge,
  Badge,
  BackButton,
  Modal,
} from "../../components/ui";
import { Pencil, RefreshCw, KeyRound, Eye, Printer } from "lucide-react";
import CreditScoreCard from "../../components/CreditScoreCard";
import ShowComputation from "../../components/ShowComputation";
import ReceiptDocument from "../../components/ReceiptDocument";
import { formatDate } from "../../lib/format";

const peso = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-[#B0AFAB]">{label}</p>
      <p className="text-sm font-medium text-[#2F3437]">{value ?? "—"}</p>
    </div>
  );
}

export default function MemberDetail() {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showAccount, setShowAccount] = useState(false);
  const [account, setAccount] = useState({ username: "", password: "" });
  const [deliveries, setDeliveries] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/members/${id}`);
      setMember(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    const [d, r] = await Promise.all([
      api.get("/production/deliveries", { params: { memberId: id } }),
      api.get("/production/receipts", { params: { memberId: id } }),
    ]);
    setDeliveries(d.data);
    setReceipts(r.data);
  }

  useEffect(() => {
    load();
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function evaluate() {
    setBusy(true);
    setError("");
    try {
      const res = await api.post(`/members/${id}/evaluate`);
      setMember((m) => ({ ...m, ...res.data.member }));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status) {
    setBusy(true);
    setError("");
    try {
      const res = await api.patch(`/members/${id}/status`, { status });
      setMember((m) => ({ ...m, ...res.data }));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function createAccount(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post(`/members/${id}/account`, account);
      setShowAccount(false);
      setAccount({ username: "", password: "" });
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;
  if (!member) return <p>Member not found.</p>;

  return (
    <div>
      <BackButton label="Back" />
      <PageHeader
        title={`${member.firstName} ${member.lastName}`}
        subtitle={member.memberNo}
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={member.status}
              onChange={(e) => changeStatus(e.target.value)}
              disabled={busy}
              className="w-36"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </Select>
            <Link to={`/members/${id}/edit`}>
              <Button variant="secondary">
                <Pencil size={16} />
                Edit
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg bg-[#FDEBEC] px-3 py-2 text-sm text-[#9F2F2D]">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <h3 className="mb-4 font-semibold text-[#2F3437]">Profile</h3>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Membership" value={<MembershipBadge type={member.membershipType} />} />
            <Field label="Status" value={<Badge color={member.status === "ACTIVE" ? "green" : "slate"}>{member.status}</Badge>} />
            <Field label="Sex" value={member.sex} />
            <Field label="Barangay" value={member.barangay?.name} />
            <Field label="Contact" value={member.contactNo} />
            <Field label="Birthdate" value={formatDate(member.birthdate)} />
            <Field label="Share capital" value={`₱${Number(member.shareCapital).toLocaleString()}`} />
            <Field label="Date joined" value={formatDate(member.dateJoined)} />
            <Field label="Address" value={member.address} />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 font-semibold text-[#2F3437]">Member Categorization</h3>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-[#B0AFAB]">Activity score</p>
                <p className="text-3xl font-bold text-[#346538]">
                  {member.activityScore != null ? member.activityScore : "—"}
                </p>
              </div>
              <CategoryBadge category={member.activityCategory} />
            </div>
            <div className="mb-3 space-y-1 rounded-lg bg-[#F7F6F3] p-3 text-xs text-[#787774]">
              <div className="flex justify-between">
                <span>Delivery Score (DS)</span>
                <span className="font-medium text-[#2F3437]">{member.deliveryScore ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Loan Score (LS)</span>
                <span className="font-medium text-[#2F3437]">{member.loanScore ?? "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span>Repayment Rate (RR)</span>
                <span className="font-medium text-[#2F3437]">
                  {member.repaymentRate != null ? `${Number(member.repaymentRate)}%` : "N/A"}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Button variant="secondary" className="w-full" onClick={evaluate} disabled={busy}>
                <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
                Re-categorize
              </Button>
              <ShowComputation
                url={`/members/${id}/progression/explain`}
                label="Show computation"
                className="w-full"
              />
            </div>
            {member.lastCategorizedAt && (
              <p className="mt-2 text-xs text-[#B0AFAB]">
                Last categorized {formatDate(member.lastCategorizedAt)}
              </p>
            )}
          </Card>

          <Card>
            <h3 className="mb-3 font-semibold text-[#2F3437]">Login account</h3>
            {member.user ? (
              <p className="text-sm text-[#787774]">
                Username: <span className="font-medium">{member.user.username}</span>
              </p>
            ) : showAccount ? (
              <form onSubmit={createAccount} className="space-y-3">
                <Input
                  label="Username"
                  value={account.username}
                  onChange={(e) => setAccount({ ...account, username: e.target.value })}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  value={account.password}
                  onChange={(e) => setAccount({ ...account, password: e.target.value })}
                  required
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={busy}>Create</Button>
                  <Button type="button" variant="ghost" onClick={() => setShowAccount(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button variant="secondary" className="w-full" onClick={() => setShowAccount(true)}>
                <KeyRound size={16} />
                Create member login
              </Button>
            )}
          </Card>

          <CreditScoreCard memberId={member.id} canCompute />
        </div>
      </div>

      <h3 className="mb-3 mt-6 font-semibold text-[#2F3437]">Delivery History</h3>
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-[#F7F6F3] text-left text-[#787774]">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Batch</th>
              <th className="px-4 py-3 font-medium">Weight (kg)</th>
              <th className="px-4 py-3 font-medium">DRC</th>
              <th className="px-4 py-3 font-medium">Gross</th>
              <th className="px-4 py-3 font-medium">Net (receipt)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F1ED]">
            {deliveries.map((d) => (
              <tr key={d.id} className="hover:bg-[#F7F6F3]">
                <td className="px-4 py-3 text-[#787774]">{formatDate(d.deliveryDate)}</td>
                <td className="px-4 py-3">
                  <Badge color="blue">{d.batch.periodType}</Badge>{" "}
                  <span className="text-[#787774]">{d.batch.barangay?.name}</span>
                </td>
                <td className="px-4 py-3 text-[#787774]">{Number(d.weightKg).toLocaleString()}</td>
                <td className="px-4 py-3 text-[#787774]">{d.drc != null ? `${d.drc}%` : "—"}</td>
                <td className="px-4 py-3 text-[#787774]">{peso(d.totalAmount)}</td>
                <td className="px-4 py-3 font-medium text-[#346538]">
                  {d.receipt ? peso(d.receipt.netAmount) : "—"}
                </td>
              </tr>
            ))}
            {deliveries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#B0AFAB]">
                  No deliveries recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <h3 className="mb-3 mt-6 font-semibold text-[#2F3437]">Receipts</h3>
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-[#F7F6F3] text-left text-[#787774]">
            <tr>
              <th className="px-4 py-3 font-medium">Receipt No.</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Gross</th>
              <th className="px-4 py-3 font-medium">Net</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F1ED]">
            {receipts.map((r) => (
              <tr key={r.id} className="hover:bg-[#F7F6F3]">
                <td className="px-4 py-3 font-medium text-[#2F3437]">
                  OR-{String(r.id).padStart(6, "0")}
                </td>
                <td className="px-4 py-3 text-[#787774]">{formatDate(r.dateIssued)}</td>
                <td className="px-4 py-3 text-[#787774]">{peso(r.grossAmount)}</td>
                <td className="px-4 py-3 font-medium text-[#346538]">{peso(r.netAmount)}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" onClick={() => setSelectedReceipt(r)}>
                    <Eye size={16} />
                    View
                  </Button>
                </td>
              </tr>
            ))}
            {receipts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[#B0AFAB]">
                  No receipts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal open={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} title="Receipt">
        {selectedReceipt && (
          <>
            <ReceiptDocument receipt={selectedReceipt} />
            <div className="mt-4 flex justify-end no-print">
              <Button onClick={() => window.print()}>
                <Printer size={16} />
                Print
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams } from "react-router";
import api, { apiError } from "../../lib/api";
import { toast } from "react-toastify";
import {
  Button,
  Card,
  Input,
  Select,
  Spinner,
  PageHeader,
  MembershipBadge,
  Badge,
  BackButton,
  Modal,
  Avatar, DataTable
} from "../../components/ui";
import { KeyRound, Eye, Printer } from "lucide-react";
import CreditScoreCard from "../../components/CreditScoreCard";
import MemberCategoryCard from "../../components/MemberCategoryCard";
import ReceiptDocument from "../../components/ReceiptDocument";
import { buildReceiptRows } from "../../lib/receiptRows";
import { formatDate } from "../../lib/format";

const RECEIPT_TYPE_COLOR = { Delivery: "green", Membership: "amber", "Loan payment": "blue" };

const peso = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-[#5F5E5A]">{label}</p>
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
    // Loan payments are their own record, not Receipt rows, so the receipts
    // section merges the two sources — same list the member sees on My Receipts.
    const [d, r, p] = await Promise.all([
      api.get("/production/deliveries", { params: { memberId: id } }),
      api.get("/production/receipts", { params: { memberId: id } }),
      api.get("/finance/loan-payments", { params: { memberId: id } }),
    ]);
    setDeliveries(d.data);
    setReceipts(buildReceiptRows(r.data, p.data));
  }

  useEffect(() => {
    load();
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function changeStatus(status) {
    setBusy(true);
    setError("");
    try {
      const res = await api.patch(`/members/${id}/status`, { status });
      setMember((m) => ({ ...m, ...res.data }));
      toast.success(`Member status set to ${status.toLowerCase()}`);
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
      toast.success("Login account created");
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
            {/* Unlabelled, this read as a mystery dropdown sitting beside the
                member's name. It is also a live control — picking a value saves
                straight away — so the hint says so rather than leaving staff
                hunting for a Save button. */}
            <Select
              label="Account status"
              hint="Saves immediately"
              value={member.status}
              onChange={(e) => changeStatus(e.target.value)}
              disabled={busy}
              className="w-40"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </Select>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg bg-[#FDEBEC] px-3 py-2 text-sm text-[#9F2F2D]">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="col-span-2">
          <div className="mb-4 flex items-center gap-4">
            <Avatar src={member.profilePhoto} name={`${member.firstName} ${member.lastName}`} size={64} />
            <div>
              <h3 className="font-semibold text-[#2F3437]">
                {member.firstName} {member.lastName}
              </h3>
              <p className="text-xs text-[#5F5E5A]">Profile</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Membership" value={<MembershipBadge type={member.membershipType} />} />
            <Field label="Account status" value={<Badge color={member.status === "ACTIVE" ? "green" : "slate"}>{member.status}</Badge>} />
            <Field label="Sex" value={member.sex} />
            <Field label="Barangay" value={member.barangay?.name} />
            <Field label="Contact" value={member.contactNo} />
            <Field label="Birthdate" value={formatDate(member.birthdate)} />
            <Field label="Date joined" value={formatDate(member.dateJoined)} />
            <Field label="Address" value={member.address} />
          </div>
        </Card>

        <div className="space-y-4">
          <MemberCategoryCard
            member={member}
            canRecategorize
            onRecategorized={(updated) => setMember((m) => ({ ...m, ...updated }))}
          />

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

          <CreditScoreCard memberId={member.id} />
        </div>
      </div>

      <h3 className="mb-3 mt-6 font-semibold text-[#2F3437]">Delivery History</h3>
      <Card className="p-0">
        <DataTable>
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Batch</th>
              <th className="px-4 py-3 font-medium">Weight (kg)</th>
              <th className="px-4 py-3 font-medium">DRC</th>
              <th className="px-4 py-3 font-medium">Gross</th>
              <th className="px-4 py-3 font-medium">Net (receipt)</th>
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
                <td className="px-4 py-3 text-[#787774]">{peso(d.totalAmount)}</td>
                <td className="px-4 py-3 font-medium text-[#346538]">
                  {d.receipt ? peso(d.receipt.netAmount) : "—"}
                </td>
              </tr>
            ))}
            {deliveries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#5F5E5A]">
                  No deliveries recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </Card>

      <h3 className="mb-3 mt-6 font-semibold text-[#2F3437]">Receipts</h3>
      <Card className="p-0">
        {/* Deliveries, membership fees and loan payments together — the same
            list the member sees on My Receipts, built by the same helper. */}
        <div className="overflow-x-auto">
          <DataTable>
            <thead>
              <tr>
                <th>Receipt No.</th>
                <th>Date</th>
                <th>Type</th>
                <th className="num">Received</th>
                <th className="num">Paid</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.key} className={r.voidedAt ? "text-[var(--ink-faint)]" : undefined}>
                  <td className={`font-medium ${r.voidedAt ? "line-through" : "text-[var(--ink-body)]"}`}>
                    {r.no}
                  </td>
                  <td className="text-[var(--ink-muted)]">{formatDate(r.date)}</td>
                  <td>
                    <Badge color={r.voidedAt ? "slate" : RECEIPT_TYPE_COLOR[r.type]}>{r.type}</Badge>
                  </td>
                  <td className="num font-medium text-[var(--brand)]">
                    {r.received != null ? peso(r.received) : "—"}
                  </td>
                  <td className="num">
                    {r.voidedAt ? (
                      <span className="font-mono-meta text-[11px] uppercase tracking-[0.12em]">Voided</span>
                    ) : r.paid != null ? (
                      <span className="font-medium text-[var(--ink-body)]">{peso(r.paid)}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-right">
                    <Button variant="ghost" onClick={() => setSelectedReceipt(r.doc)}>
                      <Eye size={16} />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
              {receipts.length === 0 && (
                <tr>
                  <td colSpan={6}>No receipts yet.</td>
                </tr>
              )}
            </tbody>
          </DataTable>
        </div>
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

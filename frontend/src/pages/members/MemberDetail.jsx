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
  Avatar,
  DataTable,
  EmptyRow,
  Pagination,
} from "../../components/ui";
import { KeyRound, Eye, Printer, Truck, ReceiptText, ChevronRight } from "lucide-react";
import CreditScoreCard from "../../components/CreditScoreCard";
import MemberCategoryCard from "../../components/MemberCategoryCard";
import ReceiptDocument from "../../components/ReceiptDocument";
import { buildReceiptRows, countsByType, RECEIPT_TYPES } from "../../lib/receiptRows";
import { usePagination } from "../../lib/usePagination";
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

// A summary that opens the full list. A real <button> rather than a div with an
// onClick, so it is reachable by keyboard and announced as something to press.
function HistoryCard({ icon: Icon, title, count, unit, lines, onClick }) {
  return (
    <button type="button" onClick={onClick} className="focus-ring w-full text-left">
      <Card className="h-full transition hover:border-[#8FB392] hover:shadow">
        <div className="mb-2 flex items-center gap-2 text-[#346538]">
          <Icon size={20} />
          <span className="text-sm font-semibold text-[#2F3437]">{title}</span>
        </div>
        <p className="text-2xl font-bold text-[#111111]">
          {count.toLocaleString()}{" "}
          <span className="text-sm font-medium text-[#787774]">{unit}</span>
        </p>
        {lines.map((l) => (
          <p key={l} className="text-sm text-[#787774]">
            {l}
          </p>
        ))}
        <p className="mt-2 inline-flex items-center text-xs font-medium text-[#346538]">
          View all
          <ChevronRight size={13} />
        </p>
      </Card>
    </button>
  );
}

const PAGE_SIZE = 10;

function DeliveriesTable({ deliveries }) {
  const { page, setPage, pageCount, pageItems } = usePagination(deliveries, PAGE_SIZE);

  return (
    <>
      <div className="overflow-x-auto">
        <DataTable>
          <thead>
            <tr>
              <th>Date</th>
              <th>Batch</th>
              <th className="num">Weight (kg)</th>
              <th className="num">DRC</th>
              <th className="num">Gross</th>
              <th className="num">Net (receipt)</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((d) => (
              <tr key={d.id}>
                <td className="text-[var(--ink-muted)]">{formatDate(d.deliveryDate)}</td>
                <td>
                  <Badge color="blue">{d.batch.periodType}</Badge>{" "}
                  <span className="text-[var(--ink-muted)]">{d.batch.barangay?.name}</span>
                </td>
                <td className="num text-[var(--ink-body)]">
                  {Number(d.weightKg).toLocaleString()}
                </td>
                <td className="num text-[var(--ink-muted)]">
                  {d.drc != null ? `${d.drc}%` : "—"}
                </td>
                <td className="num text-[var(--ink-muted)]">{peso(d.totalAmount)}</td>
                <td className="num font-medium text-[var(--brand)]">
                  {d.receipt ? peso(d.receipt.netAmount) : "—"}
                </td>
              </tr>
            ))}
            {deliveries.length === 0 && (
              <EmptyRow
                colSpan={6}
                title="No deliveries recorded yet."
                hint="Deliveries appear here once staff record them against an open batch."
              />
            )}
          </tbody>
        </DataTable>
      </div>
      <Pagination page={page} pageCount={pageCount} onPage={setPage} />
    </>
  );
}

function ReceiptsTable({ rows, onView }) {
  const { page, setPage, pageCount, pageItems } = usePagination(rows, PAGE_SIZE);

  return (
    <>
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
            {pageItems.map((r) => (
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
                    <span className="font-mono-meta text-[11px] uppercase tracking-[0.12em]">
                      Voided
                    </span>
                  ) : r.paid != null ? (
                    <span className="font-medium text-[var(--ink-body)]">{peso(r.paid)}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="text-right">
                  <Button variant="ghost" onClick={() => onView(r.doc)}>
                    <Eye size={16} />
                    View
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <EmptyRow colSpan={6} title="No receipts yet." />}
          </tbody>
        </DataTable>
      </div>
      <Pagination page={page} pageCount={pageCount} onPage={setPage} />
    </>
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
  // Which history list is open: "deliveries" | "receipts" | null.
  const [openList, setOpenList] = useState(null);

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

  // What the two summary cards show instead of the tables they replaced.
  const totals = deliveries.reduce(
    (acc, d) => ({
      kg: acc.kg + Number(d.weightKg),
      net: acc.net + (d.receipt ? Number(d.receipt.netAmount) : 0),
    }),
    { kg: 0, net: 0 }
  );
  const receiptCounts = countsByType(receipts);

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

      {/* Two long tables used to sit open on this page, so the profile above them
          scrolled away. They are summaries now, and the full list — paged, ten at
          a time — opens in a modal on click. */}
      <h3 className="mb-3 mt-6 font-semibold text-[#2F3437]">History</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <HistoryCard
          icon={Truck}
          title="Delivery history"
          count={deliveries.length}
          unit={deliveries.length === 1 ? "delivery" : "deliveries"}
          lines={[
            `${totals.kg.toLocaleString()} kg delivered`,
            `${peso(totals.net)} net across ${deliveries.length} receipts`,
          ]}
          onClick={() => setOpenList("deliveries")}
        />
        <HistoryCard
          icon={ReceiptText}
          title="Receipts"
          count={receipts.length}
          unit={receipts.length === 1 ? "document" : "documents"}
          lines={RECEIPT_TYPES.map((t) => `${receiptCounts[t]} ${t.toLowerCase()}`)}
          onClick={() => setOpenList("receipts")}
        />
      </div>

      <Modal
        open={openList === "deliveries"}
        onClose={() => setOpenList(null)}
        title="Delivery history"
        wide
      >
        <DeliveriesTable deliveries={deliveries} />
      </Modal>

      <Modal open={openList === "receipts"} onClose={() => setOpenList(null)} title="Receipts" wide>
        {/* Deliveries, membership fees and loan payments together — the same
            list the member sees on My Receipts, built by the same helper. */}
        <ReceiptsTable
          rows={receipts}
          onView={(doc) => {
            // Swap rather than stack: two open modals would both answer Escape
            // and both fight over the print styles.
            setOpenList(null);
            setSelectedReceipt(doc);
          }}
        />
      </Modal>

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

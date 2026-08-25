import { useEffect, useState } from "react";
import api, { apiError } from "../lib/api";
import {
  Button,
  Card,
  Input,
  Select,
  Spinner,
  PageHeader,
  Badge,
  Modal,
  Pagination,
  Field, DataTable
} from "../components/ui";
import { formatDate } from "../lib/format";
import { usePagination } from "../lib/usePagination";
import { Check, X, Search } from "lucide-react";
import { toast } from "react-toastify";

const STATUS_COLOR = { PENDING: "amber", APPROVED: "green", REJECTED: "red" };
const STATUSES = ["PENDING", "APPROVED", "REJECTED"];
const peso = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function LoanApplications() {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState("PENDING");
  const [active, setActive] = useState(null);
  const [search, setSearch] = useState("");
  const [barangayId, setBarangayId] = useState("");
  const [barangays, setBarangays] = useState([]);
  const { page, setPage, pageCount, pageItems } = usePagination(rows);

  async function load(overrides = {}) {
    const s = overrides.search ?? search;
    const b = overrides.barangayId ?? barangayId;
    const params = {};
    if (status) params.status = status;
    if (s) params.search = s;
    if (b) params.barangayId = b;
    const res = await api.get("/loan-applications", { params });
    setRows(res.data);
    setPage(1);
  }

  useEffect(() => {
    api.get("/barangays").then((res) => setBarangays(res.data));
  }, []);

  useEffect(() => {
    setRows(null);
    setActive(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, barangayId]);

  function clearFilters() {
    setSearch("");
    setBarangayId("");
    load({ search: "", barangayId: "" });
  }

  const hasFilters = search || barangayId;

  return (
    <div>
      <PageHeader
        title="Loan applications"
        subtitle="Review member loan requests. Approving an application issues the loan."
        actions={
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
            ))}
          </Select>
        }
      />

      <Card className="mb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-48">
            <Input
              label="Search"
              placeholder="Application No."
              value={search}
              // Emptying the box is a filter change too: without this the list
              // stays filtered while "Clear filter" vanishes along with the text.
              onChange={(e) => {
                setSearch(e.target.value);
                if (!e.target.value) load({ search: "" });
              }}
            />
          </div>
          <div className="w-48">
            <Select
              label="Barangay"
              value={barangayId}
              onChange={(e) => setBarangayId(e.target.value)}
            >
              <option value="">All barangays</option>
              {barangays.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="secondary">
            <Search size={16} />
            Filter
          </Button>
          {hasFilters && (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              <X size={16} />
              Clear filter
            </Button>
          )}
        </form>
      </Card>

      {!rows ? (
        <Spinner />
      ) : (
        <LoanTable rows={pageItems} status={status} onOpen={setActive} />
      )}

      {rows && <Pagination page={page} pageCount={pageCount} onPage={setPage} />}

      <LoanReviewModal
        application={active}
        onClose={() => setActive(null)}
        onReviewed={() => {
          setActive(null);
          load();
        }}
      />
    </div>
  );
}

function LoanTable({ rows, status, onOpen }) {
  return (
    <Card className="p-0">
      <DataTable>
        <thead>
          <tr>
            <th className="px-4 py-3 font-medium">Application No.</th>
            <th className="px-4 py-3 font-medium">Member</th>
            <th className="px-4 py-3 font-medium">Barangay</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Term</th>
            <th className="px-4 py-3 font-medium">Submitted</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="hover:bg-[#F7F6F3]">
              <td className="px-4 py-3 font-medium text-[#346538]">{a.applicationNo}</td>
              <td className="px-4 py-3 font-medium text-[#2F3437]">
                {a.member?.memberNo} — {a.member?.firstName} {a.member?.lastName}
              </td>
              <td className="px-4 py-3 text-[#787774]">{a.member?.barangay?.name ?? "—"}</td>
              <td className="px-4 py-3 text-[#787774]">{peso(a.principalAmount)}</td>
              <td className="px-4 py-3 text-[#787774]">{a.termMonths} mo</td>
              <td className="px-4 py-3 text-[#787774]">{formatDate(a.createdAt)}</td>
              <td className="px-4 py-3">
                <Badge color={STATUS_COLOR[a.status]}>{a.status}</Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <Button variant="ghost" onClick={() => onOpen(a)}>
                  {a.status === "PENDING" ? "Review" : "View"}
                </Button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-[#5F5E5A]">
                No {status ? status.toLowerCase() : ""} loan applications.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
    </Card>
  );
}

function LoanReviewModal({ application, onClose, onReviewed }) {
  const [terms, setTerms] = useState({ principalAmount: "", interestRate: "", termMonths: "", dateIssued: "" });
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deliveries, setDeliveries] = useState(null);

  useEffect(() => {
    if (application) {
      setTerms({
        principalAmount: String(Number(application.principalAmount)),
        interestRate: String(Number(application.interestRate)),
        termMonths: String(application.termMonths),
        dateIssued: "",
      });
      setNote("");
      setError("");
    }
  }, [application]);

  // Load the applicant's delivery history so staff can weigh production when
  // deciding on the loan.
  useEffect(() => {
    const memberId = application?.member?.id;
    if (!memberId) return;
    setDeliveries(null);
    api
      .get("/production/deliveries", { params: { memberId } })
      .then((res) => setDeliveries(res.data))
      .catch(() => setDeliveries([]));
  }, [application]);

  if (!application) return null;
  const pending = application.status === "PENDING";

  async function doApprove() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/loan-applications/${application.id}/approve`, {
        principalAmount: terms.principalAmount ? parseFloat(terms.principalAmount) : undefined,
        interestRate: terms.interestRate ? parseFloat(terms.interestRate) : undefined,
        termMonths: terms.termMonths ? parseInt(terms.termMonths, 10) : undefined,
        dateIssued: terms.dateIssued || undefined,
      });
      toast.success("Loan application approved — loan issued");
      onReviewed();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function doReject() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/loan-applications/${application.id}/reject`, { note: note || undefined });
      toast.success("Loan application rejected");
      onReviewed();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={!!application} onClose={onClose} title={`Loan application ${application.applicationNo}`} wide>
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-[#F6D9DA] bg-[#FDEBEC] px-3 py-2 text-sm text-[#9F2F2D]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-3">
            <Field
              label="Member"
              value={`${application.member?.memberNo} — ${application.member?.firstName} ${application.member?.lastName}`}
            />
          </div>
          <Field label="Membership" value={application.member?.membershipType} />
          <Field label="Barangay" value={application.member?.barangay?.name} />
          <Field label="Submitted" value={formatDate(application.createdAt)} />
          <Field label="Amount requested" value={peso(application.principalAmount)} />
          <Field label="Term" value={`${application.termMonths} months`} />
          <Field label="Requested rate" value={`${Number(application.interestRate)}%/mo`} />
          {application.purpose && (
            <div className="col-span-2 sm:col-span-3">
              <Field label="Purpose" value={application.purpose} />
            </div>
          )}
        </div>

        <div className="border-t border-[#EAEAEA] pt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111111]">Delivery history</h3>
            {deliveries?.length > 0 && (
              <span className="text-xs text-[#787774]">
                {deliveries.reduce((s, d) => s + Number(d.weightKg), 0).toLocaleString()} kg ·{" "}
                {deliveries.length} deliveries
              </span>
            )}
          </div>
          {deliveries === null ? (
            <p className="text-sm text-[#5F5E5A]">Loading…</p>
          ) : deliveries.length === 0 ? (
            <p className="text-sm text-[#5F5E5A]">No deliveries recorded for this member yet.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-[#F2F1ED]">
              <DataTable>
                <thead>
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Batch</th>
                    <th className="px-3 py-2 font-medium">Weight</th>
                    <th className="px-3 py-2 font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((d) => (
                    <tr key={d.id}>
                      <td className="px-3 py-2 text-[#787774]">{formatDate(d.deliveryDate)}</td>
                      <td className="px-3 py-2 text-[#787774]">
                        <Badge color="blue">{d.batch?.periodType}</Badge>{" "}
                        {d.batch?.barangay?.name ?? ""}
                      </td>
                      <td className="px-3 py-2 text-[#787774]">
                        {Number(d.weightKg).toLocaleString()} kg
                      </td>
                      <td className="px-3 py-2 font-medium text-[#346538]">
                        {d.receipt ? peso(d.receipt.netAmount) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          )}
        </div>

        {pending ? (
          <div className="grid gap-6 border-t border-[#EAEAEA] pt-6 sm:grid-cols-2">
            {/* Approve */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#111111]">Approve &amp; issue loan</h3>
              <Input
                label="Principal (₱)"
                type="number"
                step="0.01"
                value={terms.principalAmount}
                onChange={(e) => setTerms({ ...terms, principalAmount: e.target.value })}
              />
              <Input
                label="Interest %/mo"
                type="number"
                step="0.01"
                value={terms.interestRate}
                onChange={(e) => setTerms({ ...terms, interestRate: e.target.value })}
              />
              <Input
                label="Term (months)"
                type="number"
                value={terms.termMonths}
                onChange={(e) => setTerms({ ...terms, termMonths: e.target.value })}
              />
              <Input
                label="Date issued (blank = today)"
                type="date"
                value={terms.dateIssued}
                onChange={(e) => setTerms({ ...terms, dateIssued: e.target.value })}
              />
              <Button onClick={doApprove} disabled={busy} className="w-full">
                <Check size={16} />
                Approve &amp; issue loan
              </Button>
            </div>

            {/* Reject */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#111111]">Reject application</h3>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#2F3437]">Reason (optional)</span>
                <textarea
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note kept for the record."
                  className="w-full rounded-lg border border-[#EAEAEA] bg-white px-3 py-2 text-sm text-[#2F3437] outline-none transition-colors focus:border-[#346538] focus:ring-1 focus:ring-[#346538]"
                />
              </label>
              <Button variant="danger" onClick={doReject} disabled={busy} className="w-full">
                <X size={16} />
                Reject application
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t border-[#EAEAEA] pt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#787774]">Status:</span>
              <Badge color={STATUS_COLOR[application.status]}>{application.status}</Badge>
              {application.reviewedAt && (
                <span className="text-sm text-[#5F5E5A]">on {formatDate(application.reviewedAt)}</span>
              )}
            </div>
            {application.reviewNote && (
              <p className="mt-3 text-sm text-[#787774]">Note: {application.reviewNote}</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

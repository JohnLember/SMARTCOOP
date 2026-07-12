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
} from "../components/ui";
import { formatDate } from "../lib/format";
import { usePagination } from "../lib/usePagination";
import { Check, X, Search } from "lucide-react";

const STATUS_COLOR = { PENDING: "amber", APPROVED: "green", REJECTED: "red" };
const STATUSES = ["PENDING", "APPROVED", "REJECTED"];
const peso = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function Applications() {
  const [appType, setAppType] = useState("MEMBERSHIP"); // MEMBERSHIP | LOAN
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState("PENDING");
  const [active, setActive] = useState(null); // application under review
  const [search, setSearch] = useState("");
  const [barangayId, setBarangayId] = useState("");
  const [barangays, setBarangays] = useState([]);
  const { page, setPage, pageCount, pageItems } = usePagination(rows);

  const isLoan = appType === "LOAN";

  async function load(overrides = {}) {
    const s = overrides.search ?? search;
    const b = overrides.barangayId ?? barangayId;
    const t = overrides.appType ?? appType;
    const params = {};
    if (status) params.status = status;
    if (s) params.search = s;
    if (b) params.barangayId = b;
    const res = await api.get(t === "LOAN" ? "/loan-applications" : "/applications", { params });
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
  }, [status, barangayId, appType]);

  function clearFilters() {
    setSearch("");
    setBarangayId("");
    load({ search: "", barangayId: "" });
  }

  const hasFilters = search || barangayId;

  return (
    <div>
      <PageHeader
        title="Applications"
        subtitle={
          isLoan
            ? "Review member loan requests. Approving an application issues the loan."
            : "Review prospective members. Approving an application creates their member record."
        }
        actions={
          <div className="flex gap-2">
            <Select
              value={appType}
              onChange={(e) => {
                // Clear rows in the same update as the type switch so we never
                // render one type's table against the other type's stale data.
                setRows(null);
                setActive(null);
                setAppType(e.target.value);
              }}
              className="w-44"
            >
              <option value="MEMBERSHIP">Membership</option>
              <option value="LOAN">Loan</option>
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
              ))}
            </Select>
          </div>
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
              onChange={(e) => setSearch(e.target.value)}
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
      ) : isLoan ? (
        <LoanTable rows={pageItems} status={status} onOpen={setActive} />
      ) : (
        <MembershipTable rows={pageItems} status={status} onOpen={setActive} />
      )}

      {rows && <Pagination page={page} pageCount={pageCount} onPage={setPage} />}

      {isLoan ? (
        <LoanReviewModal
          application={active}
          onClose={() => setActive(null)}
          onReviewed={() => {
            setActive(null);
            load();
          }}
        />
      ) : (
        <ReviewModal
          application={active}
          onClose={() => setActive(null)}
          onReviewed={() => {
            setActive(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function MembershipTable({ rows, status, onOpen }) {
  return (
    <Card className="p-0">
      <table className="w-full text-sm">
        <thead className="bg-[#F7F6F3] text-left text-[#787774]">
          <tr>
            <th className="px-4 py-3 font-medium">Application No.</th>
            <th className="px-4 py-3 font-medium">Applicant</th>
            <th className="px-4 py-3 font-medium">Barangay</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            <th className="px-4 py-3 font-medium">Submitted</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F2F1ED]">
          {rows.map((a) => (
            <tr key={a.id} className="hover:bg-[#F7F6F3]">
              <td className="px-4 py-3 font-medium text-[#346538]">{a.applicationNo}</td>
              <td className="px-4 py-3 font-medium text-[#2F3437]">
                {a.firstName} {a.lastName}
              </td>
              <td className="px-4 py-3 text-[#787774]">{a.barangay?.name ?? "—"}</td>
              <td className="px-4 py-3 text-[#787774]">{a.contactNo ?? "—"}</td>
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
              <td colSpan={7} className="px-4 py-10 text-center text-[#B0AFAB]">
                No {status ? status.toLowerCase() : ""} applications.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}

function LoanTable({ rows, status, onOpen }) {
  return (
    <Card className="p-0">
      <table className="w-full text-sm">
        <thead className="bg-[#F7F6F3] text-left text-[#787774]">
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
        <tbody className="divide-y divide-[#F2F1ED]">
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
              <td colSpan={8} className="px-4 py-10 text-center text-[#B0AFAB]">
                No {status ? status.toLowerCase() : ""} loan applications.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}

function LoanReviewModal({ application, onClose, onReviewed }) {
  const [terms, setTerms] = useState({ principalAmount: "", interestRate: "", termMonths: "" });
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (application) {
      setTerms({
        principalAmount: String(Number(application.principalAmount)),
        interestRate: String(Number(application.interestRate)),
        termMonths: String(application.termMonths),
      });
      setNote("");
      setError("");
    }
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
      });
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
                <span className="text-sm text-[#B0AFAB]">on {formatDate(application.reviewedAt)}</span>
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

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-[#B0AFAB]">{label}</p>
      <p className="text-sm font-medium text-[#2F3437]">{value || "—"}</p>
    </div>
  );
}

function ReviewModal({ application, onClose, onReviewed }) {
  const [approve, setApprove] = useState({ memberNo: "" });
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (application) {
      setApprove({ memberNo: "" });
      setNote("");
      setError("");
    }
  }, [application]);

  if (!application) return null;
  const pending = application.status === "PENDING";

  async function doApprove() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/applications/${application.id}/approve`, {
        memberNo: approve.memberNo || undefined,
      });
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
      await api.post(`/applications/${application.id}/reject`, { note: note || undefined });
      onReviewed();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={!!application} onClose={onClose} title={`${application.firstName} ${application.lastName}`} wide>
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-[#F6D9DA] bg-[#FDEBEC] px-3 py-2 text-sm text-[#9F2F2D]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Application No." value={application.applicationNo} />
          <Field label="Barangay" value={application.barangay?.name} />
          <Field label="Contact" value={application.contactNo} />
          <Field label="Email" value={application.email} />
          <Field label="Sex" value={application.sex} />
          <Field label="Birthdate" value={application.birthdate ? formatDate(application.birthdate) : ""} />
          <div className="col-span-2 sm:col-span-3">
            <Field label="Address" value={application.address} />
          </div>
          {application.reason && (
            <div className="col-span-2 sm:col-span-3">
              <Field label="Reason for joining" value={application.reason} />
            </div>
          )}
        </div>

        {pending ? (
          <div className="grid gap-6 border-t border-[#EAEAEA] pt-6 sm:grid-cols-2">
            {/* Approve */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#111111]">Approve as member</h3>
              <Input
                label="Member no. (blank = auto)"
                value={approve.memberNo}
                onChange={(e) => setApprove({ ...approve, memberNo: e.target.value })}
                placeholder="e.g. M-0006"
              />
              <p className="text-xs leading-relaxed text-[#787774]">
                Joins as <span className="font-medium text-[#2F3437]">Associate</span> and
                auto-promotes to Regular once CBU or savings reach ₱10,000.
              </p>
              <Button onClick={doApprove} disabled={busy} className="w-full">
                <Check size={16} />
                Approve &amp; create member
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
                <span className="text-sm text-[#B0AFAB]">on {formatDate(application.reviewedAt)}</span>
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

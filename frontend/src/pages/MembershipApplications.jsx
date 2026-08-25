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
  Field,
} from "../components/ui";
import { formatDate } from "../lib/format";
import { usePagination } from "../lib/usePagination";
import ReceiptDocument from "../components/ReceiptDocument";
import { Check, X, Search, Printer } from "lucide-react";
import { toast } from "react-toastify";

const STATUS_COLOR = { PENDING: "amber", APPROVED: "green", REJECTED: "red" };
const STATUSES = ["PENDING", "APPROVED", "REJECTED"];

export default function MembershipApplications() {
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
    const res = await api.get("/applications", { params });
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
        title="Membership applications"
        subtitle="Review prospective members. Approving an application creates their member record."
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
        <MembershipTable rows={pageItems} status={status} onOpen={setActive} />
      )}

      {rows && <Pagination page={page} pageCount={pageCount} onPage={setPage} />}

      <ReviewModal
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

function ReviewModal({ application, onClose, onReviewed }) {
  const [approve, setApprove] = useState({ memberNo: "" });
  const [feePaid, setFeePaid] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [creds, setCreds] = useState(null);
  const [approved, setApproved] = useState(null);

  useEffect(() => {
    if (application) {
      setApprove({ memberNo: "" });
      setFeePaid(false);
      setNote("");
      setError("");
      setCreds(null);
      setApproved(null);
    }
  }, [application]);

  if (!application) return null;
  const pending = application.status === "PENDING";

  async function doApprove() {
    setBusy(true);
    setError("");
    try {
      const res = await api.post(`/applications/${application.id}/approve`, {
        memberNo: approve.memberNo || undefined,
      });
      toast.success("Application approved — member created");
      setCreds(res.data.credentials);
      setApproved(res.data);
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
      toast.success("Application rejected");
      onReviewed();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function doReconsider() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/applications/${application.id}/reconsider`);
      toast.success("Application moved back to pending");
      onReviewed();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function doUnapprove() {
    if (!confirm("Revert this approval? The member record and all their deliveries, receipts, loans and payments will be permanently deleted. This cannot be undone."))
      return;
    setBusy(true);
    setError("");
    try {
      await api.post(`/applications/${application.id}/unapprove`);
      toast.success("Approval reverted — member deleted, application back to pending");
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

        {creds ? (
          <div className="border-t border-[#EAEAEA] pt-6">
            <h3 className="text-sm font-semibold text-[#111111]">Member login created</h3>
            <p className="mt-1 text-xs text-[#787774]">
              Give these to the member. The password is shown only now.
            </p>
            <div className="mt-3 space-y-2">
              {[
                ["Username", creds.username],
                ["Password", creds.password],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-lg bg-[#F7F6F3] px-3 py-2">
                  <div>
                    <p className="text-xs text-[#787774]">{label}</p>
                    <p className="font-mono text-sm text-[#2F3437]">{value}</p>
                  </div>
                  <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(value)}>
                    Copy
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-[#EAEAEA] pt-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#111111]">Membership fee receipt</h3>
                <Button variant="secondary" onClick={() => window.print()}>
                  <Printer size={16} />
                  Print
                </Button>
              </div>
              {approved?.membershipReceipt && <ReceiptDocument receipt={approved.membershipReceipt} />}
            </div>

            <Button onClick={onReviewed} className="mt-4">Done</Button>
          </div>
        ) : pending ? (
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
                auto-promotes to Regular once CBU reaches ₱10,000.
              </p>
              <label className="flex items-start gap-2 rounded-lg bg-[#F7F6F3] px-3 py-2 text-xs leading-relaxed text-[#787774]">
                <input
                  type="checkbox"
                  checked={feePaid}
                  onChange={(e) => setFeePaid(e.target.checked)}
                  className="mt-0.5 accent-[#346538]"
                />
                <span>
                  Applicant has paid the{" "}
                  <span className="font-medium text-[#2F3437]">₱300 membership fee</span> at the
                  cooperative office.
                </span>
              </label>
              <Button onClick={doApprove} disabled={busy || !feePaid} className="w-full">
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
            {application.status === "REJECTED" && (
              <Button variant="secondary" onClick={doReconsider} disabled={busy} className="mt-4">
                <Check size={16} />
                Reconsider — move back to pending
              </Button>
            )}
            {application.status === "APPROVED" && (
              <Button variant="danger" onClick={doUnapprove} disabled={busy} className="mt-4">
                <X size={16} />
                Revert approval — delete member, back to pending
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router";
import api, { apiError } from "../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import {
  Card,
  Spinner,
  PageHeader,
  MembershipBadge,
  Badge,
  Button,
  Input,
  Select,
  Modal,
  Avatar,
} from "../components/ui";
import { Truck, Wallet, Pencil, Camera, Plus } from "lucide-react";
import CreditScoreCard from "../components/CreditScoreCard";
import MemberCategoryCard from "../components/MemberCategoryCard";
import ShowComputation from "../components/ShowComputation";
import { formatDate } from "../lib/format";

const peso = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

// Read an image File, downscale it to a small square-ish JPEG, and return a
// base64 data URL small enough to store inline (no separate file storage).
function fileToCompressedDataUrl(file, maxDim = 400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
  const [loanApps, setLoanApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [applying, setApplying] = useState(false);

  function reloadLoanApps() {
    api.get("/loan-applications").then((res) => setLoanApps(res.data));
  }

  useEffect(() => {
    if (!user?.memberId) {
      setLoading(false);
      return;
    }
    Promise.all([
      api.get(`/members/${user.memberId}`),
      api.get("/production/deliveries"),
      api.get("/finance/loans"),
      api.get("/loan-applications"),
    ])
      .then(([m, d, l, la]) => {
        setMember(m.data);
        setDeliveries(d.data);
        setLoans(l.data);
        setLoanApps(la.data);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const deliverySummary = deliveries.reduce(
    (acc, d) => {
      acc.kg += Number(d.weightKg);
      acc.net += d.receipt ? Number(d.receipt.netAmount) : 0;
      acc.cbu += d.receipt ? Number(d.receipt.cbu) : 0;
      return acc;
    },
    { kg: 0, net: 0, cbu: 0 }
  );

  const activeLoan = loans.find((l) => l.status === "ACTIVE");
  const pendingLoanApp = loanApps.find((a) => a.status === "PENDING");

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
          <div className="mb-4 flex items-center gap-4">
            <Avatar src={member.profilePhoto} name={`${member.firstName} ${member.lastName}`} size={64} />
            <h3 className="font-semibold text-[#2F3437]">
              {member.firstName} {member.lastName}
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Membership" value={<MembershipBadge type={member.membershipType} />} />
            <Field label="Account status" value={<Badge color={member.status === "ACTIVE" ? "green" : "slate"}>{member.status}</Badge>} />
            <Field label="Barangay" value={member.barangay?.name} />
            <Field label="Contact" value={member.contactNo} />
            <Field label="CBU (Capital Build-Up) total" value={peso(deliverySummary.cbu)} />
            <Field label="Date joined" value={formatDate(member.dateJoined)} />
          </div>
          {member.membershipType === "ASSOCIATE" && (
            <p className="mt-3 text-xs text-[#787774]">
              You become a <span className="font-medium text-[#2F3437]">Regular</span> member once your CBU
              reaches ₱10,000 — {peso(Math.max(0, 10000 - deliverySummary.cbu))} to go.
            </p>
          )}
        </Card>

        <div className="space-y-4">
          <MemberCategoryCard member={member} />

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

          <div className="mt-3 border-t border-[#F2F1ED] pt-3">
            {member.membershipType === "REGULAR" ? (
              pendingLoanApp ? (
                <p className="text-xs text-[#787774]">
                  Loan application{" "}
                  <span className="font-medium text-[#2F3437]">{pendingLoanApp.applicationNo}</span> —{" "}
                  <span className="font-medium text-amber-600">pending review</span>
                </p>
              ) : (
                <Button variant="secondary" className="w-full" onClick={() => setApplying(true)}>
                  <Plus size={16} />
                  Apply for loan
                </Button>
              )
            ) : (
              <p className="text-xs text-[#B0AFAB]">
                Only <span className="font-medium text-[#2F3437]">Regular</span> members can apply for
                a loan.
              </p>
            )}
          </div>
        </Card>
      </div>

      <LoanApplyModal
        open={applying}
        onClose={() => setApplying(false)}
        onSubmitted={() => {
          setApplying(false);
          reloadLoanApps();
        }}
      />

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
  const [photo, setPhoto] = useState(null); // null = unchanged; "" = removed; string = new data URL
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
      setPhoto(null);
      setError("");
    }
  }, [open, member]);

  async function onPickPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      setPhoto(await fileToCompressedDataUrl(file));
    } catch {
      setError("Could not read that image. Try a different file.");
    }
  }

  // The image currently shown in the modal preview.
  const previewSrc = photo === null ? member.profilePhoto : photo || null;

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
      // Only send the photo if it changed (new upload or removal).
      if (photo !== null) payload.profilePhoto = photo || null;
      const res = await api.put(`/members/${member.id}/profile`, payload);
      toast.success("Profile updated");
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
        <div className="flex items-center gap-4">
          <Avatar src={previewSrc} name={`${member.firstName} ${member.lastName}`} size={64} />
          <div className="flex flex-wrap gap-2">
            <label className="btn-press inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#EAEAEA] bg-white px-3 py-2 text-sm font-medium text-[#2F3437] hover:bg-[#F7F6F3]">
              <Camera size={16} />
              {previewSrc ? "Change photo" : "Upload photo"}
              <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
            </label>
            {previewSrc && (
              <Button type="button" variant="ghost" onClick={() => setPhoto("")}>
                Remove
              </Button>
            )}
          </div>
        </div>
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

function LoanApplyModal({ open, onClose, onSubmitted }) {
  const [form, setForm] = useState({ principalAmount: "", termMonths: "12", purpose: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ principalAmount: "", termMonths: "12", purpose: "" });
      setError("");
    }
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/loan-applications", {
        principalAmount: parseFloat(form.principalAmount),
        termMonths: parseInt(form.termMonths, 10),
        purpose: form.purpose || null,
      });
      toast.success("Loan application submitted");
      onSubmitted();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Apply for a loan">
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-[#FDEBEC] px-3 py-2 text-sm text-[#9F2F2D]">{error}</div>
        )}
        <p className="text-sm text-[#787774]">
          Cooperative staff will review your request. Interest is charged at the standard 5% per
          month on the diminishing balance, and repayments are auto-deducted from your deliveries.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Amount requested (₱)"
            type="number"
            step="0.01"
            value={form.principalAmount}
            onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
            required
          />
          <Input
            label="Term (months)"
            type="number"
            value={form.termMonths}
            onChange={(e) => setForm({ ...form, termMonths: e.target.value })}
            required
          />
        </div>
        <Input
          label="Purpose (optional)"
          value={form.purpose}
          onChange={(e) => setForm({ ...form, purpose: e.target.value })}
          placeholder="e.g. farm inputs, equipment"
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit application"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

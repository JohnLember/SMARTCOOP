import { useEffect, useState } from "react";
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
import { Pencil, Camera } from "lucide-react";
import CreditScoreCard from "../components/CreditScoreCard";
import MemberCategoryCard from "../components/MemberCategoryCard";
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
      <p className="text-xs text-[#5F5E5A]">{label}</p>
      <p className="text-sm font-medium text-[#2F3437]">{value ?? "—"}</p>
    </div>
  );
}

export default function MemberSelfView() {
  const { user } = useAuth();
  const [member, setMember] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user?.memberId) {
      setLoading(false);
      return;
    }
    // Deliveries are still needed here: CBU total is derived from their receipts.
    // Loans and applications moved to the member dashboard with the Activity cards.
    Promise.all([api.get(`/members/${user.memberId}`), api.get("/production/deliveries")])
      .then(([m, d]) => {
        setMember(m.data);
        setDeliveries(d.data);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const cbuTotal = deliveries.reduce(
    (sum, d) => sum + (d.receipt ? Number(d.receipt.cbu) : 0),
    0
  );

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="col-span-2">
          <div className="mb-4 flex items-center gap-4">
            <Avatar src={member.profilePhoto} name={`${member.firstName} ${member.lastName}`} size={64} />
            <h3 className="font-semibold text-[#2F3437]">
              {member.firstName} {member.lastName}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Membership" value={<MembershipBadge type={member.membershipType} />} />
            <Field label="Account status" value={<Badge color={member.status === "ACTIVE" ? "green" : "slate"}>{member.status}</Badge>} />
            <Field label="Barangay" value={member.barangay?.name} />
            <Field label="Contact" value={member.contactNo} />
            <Field label="CBU (Capital Build-Up) total" value={peso(cbuTotal)} />
            <Field label="Date joined" value={formatDate(member.dateJoined)} />
          </div>
          {member.membershipType === "ASSOCIATE" && (
            <p className="mt-3 text-xs text-[#787774]">
              You become a <span className="font-medium text-[#2F3437]">Regular</span> member once your CBU
              reaches ₱10,000 — {peso(Math.max(0, 10000 - cbuTotal))} to go.
            </p>
          )}
        </Card>

        <div className="space-y-4">
          <MemberCategoryCard member={member} />

          <CreditScoreCard memberId={member.id} />
        </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

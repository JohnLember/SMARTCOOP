import { useEffect, useState } from "react";
import { Link } from "react-router";
import api, { apiError } from "../lib/api";
import { Button, Input, Select, Textarea } from "../components/ui";
import { Leaf, ArrowLeft, Check } from "lucide-react";

const EMPTY = {
  firstName: "",
  middleName: "",
  lastName: "",
  sex: "",
  birthdate: "",
  contactNo: "",
  email: "",
  barangayId: "",
  address: "",
  reason: "",
};

export default function Apply() {
  const [form, setForm] = useState(EMPTY);
  const [barangays, setBarangays] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get("/applications/barangays").then((res) => setBarangays(res.data)).catch(() => {});
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/applications", {
        firstName: form.firstName,
        middleName: form.middleName || null,
        lastName: form.lastName,
        sex: form.sex || null,
        birthdate: form.birthdate || null,
        contactNo: form.contactNo,
        email: form.email || null,
        barangayId: form.barangayId ? Number(form.barangayId) : null,
        address: form.address,
        reason: form.reason || null,
      });
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#FBFBFA] font-sans-ui text-[#2F3437]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="ambient-blob absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(52,101,56,0.10) 0%, rgba(52,101,56,0) 70%)" }}
        />
      </div>

      <div className="relative mx-auto max-w-2xl px-6 py-12">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-[#787774] transition-colors hover:text-[#111111]"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#111111] text-white">
            <Leaf size={22} />
          </span>
          <h1 className="page-head font-serif-display text-4xl text-[#111111]">
            Apply for membership
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-[1.6] text-[#787774]">
            Join the San Luis Rubber Producer&apos;s Cooperative. Submit your details and the
            cooperative office will review your application.
          </p>
        </div>

        {done ? (
          <div className="rounded-xl border border-[#EAEAEA] bg-white p-8 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#EDF3EC] text-[#346538]">
              <Check size={24} />
            </span>
            <h2 className="font-serif-display text-2xl text-[#111111]">Application received</h2>
            <p className="mx-auto mt-3 max-w-sm text-[15px] leading-[1.6] text-[#787774]">
              Thank you, {form.firstName}. The cooperative office will review your application and
              contact you about the next steps. Once approved, an account can be issued for you.
            </p>
            <Link to="/" className="mt-6 inline-block">
              <Button variant="secondary">Return home</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-xl border border-[#EAEAEA] bg-white p-7">
            {error && (
              <div className="mb-4 rounded-lg border border-[#F6D9DA] bg-[#FDEBEC] px-3 py-2 text-sm text-[#9F2F2D]">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="First name" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
              <Input label="Last name" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />
              <Input label="Middle name" value={form.middleName} onChange={(e) => set("middleName", e.target.value)} />
              <Select label="Sex" value={form.sex} onChange={(e) => set("sex", e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </Select>
              <Input label="Birthdate" type="date" value={form.birthdate} onChange={(e) => set("birthdate", e.target.value)} required />
              <Input label="Contact number" value={form.contactNo} onChange={(e) => set("contactNo", e.target.value)} placeholder="+63 9xx xxx xxxx" required />
              <Input label="Email (optional)" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              <Select label="Barangay" value={form.barangayId} onChange={(e) => set("barangayId", e.target.value)} required>
                <option value="">Select barangay…</option>
                {barangays.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
              <div className="sm:col-span-2">
                <Input label="Address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Purok / street, barangay, municipality" required />
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label="Why do you want to join? (optional)"
                  value={form.reason}
                  onChange={(e) => set("reason", e.target.value)}
                  placeholder="Tell the cooperative a little about your rubber farming."
                />
              </div>
            </div>

            <p className="mt-4 rounded-lg bg-[#F7F6F3] px-3 py-2 text-xs leading-relaxed text-[#787774]">
              New members join as <span className="font-medium text-[#2F3437]">Associate</span> and
              become <span className="font-medium text-[#2F3437]">Regular</span> once their CBU or
              savings reach ₱10,000.
            </p>

            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="text-xs text-[#B0AFAB]">
                Already a member? <Link to="/login" className="text-[#346538] hover:underline">Sign in</Link>
              </p>
              <Button type="submit" disabled={busy}>
                {busy ? "Submitting…" : "Submit application"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

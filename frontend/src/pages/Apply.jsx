import { useEffect, useState } from "react";
import { Link } from "react-router";
import api, { apiError } from "../lib/api";
import { Button, Input, Select, Textarea } from "../components/ui";
import { IconLeaf, Herringbone } from "../components/brand";
import { BRAND } from "../lib/brandTokens";
import { ArrowLeft, Check } from "lucide-react";
import aboutPhoto from "../assets/about_photo.jpg";

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
  const [applicationNo, setApplicationNo] = useState("");

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
      const res = await api.post("/applications", {
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
      setApplicationNo(res.data.applicationNo);
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] font-tap-body" style={{ background: BRAND.latex }}>
      {/* Left pane — the world: dark canopy, photography, what joining means. */}
      <div
        className="sticky top-0 hidden h-[100dvh] w-[38%] flex-none overflow-hidden lg:block"
        style={{ background: BRAND.canopy }}
      >
        <img
          src={aboutPhoto}
          alt="Members bringing rubber to a cooperative collection point"
          className="h-full w-full object-cover opacity-60"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `linear-gradient(180deg, rgba(16,23,15,0.5), rgba(16,23,15,0.9))` }}
        />

        <div className="relative flex h-full flex-col justify-between p-10">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
              style={{ background: "#111111" }}
            >
              <IconLeaf size={16} />
            </span>
            <span className="font-tap-display text-[15px] font-medium tracking-tight" style={{ color: BRAND.latex }}>
              SMARTCOOP
            </span>
          </Link>

          <div>
            <p className="font-tap-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: BRAND.amberSoft }}>
              Becoming a member
            </p>
            <h2 className="font-tap-display mt-4 max-w-xs text-3xl font-light leading-[1.15]" style={{ color: BRAND.latex }}>
              Join as an Associate, share your rubber, and let the cooperative do the counting.
            </h2>
            <p className="mt-5 max-w-xs text-sm leading-[1.6]" style={{ color: "rgba(242,236,218,0.55)" }}>
              Every applicant is reviewed by the cooperative office. Once approved, you get an
              account with your own deliveries, receipts, and loan history.
            </p>
          </div>
        </div>
      </div>

      {/* Herringbone seam between the two panes. */}
      <div className="sticky top-0 hidden h-[100dvh] w-3.5 flex-none lg:block" style={{ background: BRAND.latex }}>
        <Herringbone orientation="vertical" stroke={BRAND.inkMuted} size={14} />
      </div>

      {/* Right pane — the task: the application form. */}
      <div className="flex-1 px-6 py-12">
        <div className="page-head mx-auto max-w-xl">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium transition-colors lg:hidden"
            style={{ color: BRAND.inkMuted }}
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>

          <span
            className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg text-white lg:hidden"
            style={{ background: "#111111" }}
          >
            <IconLeaf size={22} />
          </span>

          <h1 className="font-tap-display text-4xl font-light" style={{ color: BRAND.ink }}>
            Apply for membership
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-[1.6]" style={{ color: BRAND.inkMuted }}>
            Submit your details and the cooperative office will review your application.
          </p>

          {done ? (
            <div className="mt-8 rounded-sm p-8 text-center" style={{ background: "#FBF9F1", border: `1px solid ${BRAND.latexLine}` }}>
              <span
                className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: "rgba(63,90,62,0.12)", color: BRAND.moss }}
              >
                <Check size={24} />
              </span>
              <h2 className="font-tap-display text-2xl font-light" style={{ color: BRAND.ink }}>
                Application received
              </h2>
              <div
                className="mx-auto mt-4 inline-block rounded-sm px-4 py-2"
                style={{ background: "rgba(63,90,62,0.08)", border: `1px solid ${BRAND.latexLine}` }}
              >
                <p className="font-tap-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: BRAND.inkMuted }}>
                  Application No.
                </p>
                <p className="font-tap-display text-xl font-medium" style={{ color: BRAND.moss }}>
                  {applicationNo}
                </p>
              </div>
              <p
                className="mx-auto mt-4 max-w-sm rounded-sm px-4 py-3 text-sm leading-[1.6]"
                style={{ background: "rgba(185,112,31,0.1)", border: `1px solid ${BRAND.latexLine}`, color: BRAND.ink }}
              >
                <span className="font-medium">Note:</span> A ₱300 membership fee is required to become
                a member. Please pay it at the cooperative office.
              </p>
              <p className="mx-auto mt-3 max-w-sm text-[15px] leading-[1.6]" style={{ color: BRAND.inkMuted }}>
                Thank you, {form.firstName}. Keep your application number for reference. The
                cooperative office will review your application and contact you about the next
                steps. Once approved, an account can be issued for you.
              </p>
              <Link to="/" className="mt-6 inline-block">
                <Button variant="secondary">Return home</Button>
              </Link>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="mt-8 rounded-sm p-7"
              style={{ background: "#FBF9F1", border: `1px solid ${BRAND.latexLine}` }}
            >
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

              <p
                className="mt-4 rounded-lg px-3 py-2 text-xs leading-relaxed"
                style={{ background: BRAND.cured, color: BRAND.inkMuted }}
              >
                New members join as <span className="font-medium" style={{ color: BRAND.ink }}>Associate</span> and
                become <span className="font-medium" style={{ color: BRAND.ink }}>Regular</span> once their CBU
                reaches ₱10,000.
              </p>

              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-xs" style={{ color: BRAND.inkMuted }}>
                  Already a member?{" "}
                  <Link to="/login" className="font-medium hover:underline" style={{ color: BRAND.moss }}>
                    Sign in
                  </Link>
                </p>
                <Button type="submit" disabled={busy}>
                  {busy ? "Submitting…" : "Submit application"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

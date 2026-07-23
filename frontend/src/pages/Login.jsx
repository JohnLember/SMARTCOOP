import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import { apiError } from "../lib/api";
import { Button, Input } from "../components/ui";
import { IconLeaf, Herringbone } from "../components/brand";
import { BRAND } from "../lib/brandTokens";
import { ArrowLeft } from "lucide-react";
import heroBandPhoto from "../assets/Hero_band_photo.jpg";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  async function onSubmit(data) {
    setError("");
    try {
      const user = await login(data.username, data.password);
      // Route to a sensible landing page per role.
      const home =
        user.role === "MEMBER" ? "/me" : user.role === "MAO" ? "/mao" : "/dashboard";
      navigate(home, { replace: true });
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <div className="flex min-h-[100dvh] font-tap-body" style={{ background: BRAND.latex }}>
      {/* Left pane — the world: dark canopy, photography, a returning line. */}
      <div
        className="relative hidden w-[42%] flex-none overflow-hidden lg:block"
        style={{ background: BRAND.canopy }}
      >
        <img
          src={heroBandPhoto}
          alt="A member tapping rubber before dawn in San Luis"
          className="h-full w-full object-cover opacity-60"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `linear-gradient(180deg, rgba(16,23,15,0.55), rgba(16,23,15,0.88))` }}
        />
        <div
          aria-hidden="true"
          className="tap-glint pointer-events-none absolute left-[30%] top-[26%] h-2 w-2 rounded-full"
          style={{ background: BRAND.amber, boxShadow: "0 0 34px 12px rgba(185,112,31,0.35)" }}
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
              San Luis Rubber Producer&apos;s Cooperative
            </p>
            <h2 className="font-tap-display mt-4 max-w-xs text-3xl font-light leading-[1.15]" style={{ color: BRAND.latex }}>
              Your deliveries, receipts, and dues — right where you left them.
            </h2>
          </div>
        </div>
      </div>

      {/* Herringbone seam between the two panes. */}
      <div className="hidden w-3.5 flex-none lg:block" style={{ background: BRAND.latex }}>
        <Herringbone orientation="vertical" stroke={BRAND.inkMuted} size={14} />
      </div>

      {/* Right pane — the task: the sign-in form. */}
      <div className="relative flex flex-1 items-center justify-center overflow-y-auto px-6 py-12">
        <div className="page-head w-full max-w-sm">
          <div className="mb-8 flex lg:justify-end">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: BRAND.inkMuted }}
            >
              <ArrowLeft size={16} />
              Back to home
            </Link>
          </div>

          <div className="mb-7 lg:hidden">
            <span
              className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg text-white"
              style={{ background: "#111111" }}
            >
              <IconLeaf size={22} />
            </span>
          </div>

          <h1 className="font-tap-display text-3xl font-light" style={{ color: BRAND.ink }}>
            Sign in
          </h1>
          <p className="mt-2 text-sm" style={{ color: BRAND.inkMuted }}>
            Welcome back to the cooperative.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
            {error && (
              <div className="rounded-lg border border-[#F6D9DA] bg-[#FDEBEC] px-3 py-2 text-sm text-[#9F2F2D]">
                {error}
              </div>
            )}
            <Input
              label="Username"
              autoFocus
              {...register("username", { required: "Username is required" })}
              error={errors.username?.message}
            />
            <Input
              label="Password"
              type="password"
              {...register("password", { required: "Password is required" })}
              error={errors.password?.message}
            />
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: BRAND.inkMuted }}>
            New here?{" "}
            <Link to="/apply" className="font-medium hover:underline" style={{ color: BRAND.moss }}>
              Apply for membership
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

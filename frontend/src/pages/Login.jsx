import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import { apiError } from "../lib/api";
import { Button, Input } from "../components/ui";
import { Leaf, ArrowLeft } from "lucide-react";

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
        user.role === "MEMBER" ? "/me" : user.role === "MAO" ? "/mao" : "/members";
      navigate(home, { replace: true });
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#FBFBFA] px-4">
      {/* ambient warm-green blob, matched to the landing */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="ambient-blob absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(52,101,56,0.10) 0%, rgba(52,101,56,0) 70%)",
          }}
        />
      </div>

      <div className="page-head relative w-full max-w-sm">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#787774] transition-colors hover:text-[#111111]"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <div className="mb-7 flex flex-col items-center text-center">
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#111111] text-white">
            <Leaf size={22} />
          </span>
          <h1 className="font-serif-display text-3xl text-[#111111]">Welcome back</h1>
          <p className="mt-2 text-sm text-[#787774]">
            Sign in to the San Luis Rubber Producer&apos;s Cooperative
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-xl border border-[#EAEAEA] bg-white p-6"
        >
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

        <p className="mt-6 text-center text-sm text-[#787774]">
          New here?{" "}
          <Link to="/apply" className="font-medium text-[#346538] hover:underline">
            Apply for membership
          </Link>
        </p>
      </div>
    </div>
  );
}

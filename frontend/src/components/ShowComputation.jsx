import { useState } from "react";
import api, { apiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Modal, Button, Spinner } from "./ui";
import { Calculator } from "lucide-react";

// A button that opens a modal explaining a computation step-by-step.
// `url` is a backend explain endpoint returning { title, description, steps[], result }.
// Members never see computations — staff/admin only. Single gate here covers
// every call site (self-view, deliveries, score/category cards).
export default function ShowComputation({ url, label = "Show computation", variant = "ghost", className = "" }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function openModal() {
    setOpen(true);
    setLoading(true);
    setError("");
    try {
      const res = await api.get(url);
      setData(res.data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  if (user?.role === "MEMBER") return null;

  return (
    <>
      <Button type="button" variant={variant} className={className} onClick={openModal}>
        <Calculator size={16} />
        {label}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={data?.title || "Computation"} wide>
        {loading && <Spinner />}
        {error && <p className="text-sm text-[#9F2F2D]">{error}</p>}
        {data && <ComputationSteps data={data} />}
      </Modal>
    </>
  );
}

function ComputationSteps({ data }) {
  return (
    <div>
      {data.description && <p className="mb-4 text-sm text-[#787774]">{data.description}</p>}
      <ol className="space-y-3">
        {data.steps.map((s, i) => (
          <li key={i} className="rounded-lg border border-[#EAEAEA] p-3">
            <p className="mb-1 text-sm font-semibold text-[#2F3437]">
              {i + 1}. {s.label}
            </p>
            <p className="font-mono text-xs text-[#787774]">{s.formula}</p>
            <p className="mt-1 break-words font-mono text-xs text-[#787774]">= {s.substitution}</p>
            <p className="mt-1 text-sm font-bold text-[#346538]">= {s.result}</p>
          </li>
        ))}
      </ol>
      {data.result && (
        <div className="mt-4 flex items-baseline gap-2 rounded-lg bg-[#EDF3EC] p-3 text-[#2b5330]">
          <span className="text-sm">{data.result.label}:</span>
          <span className="text-lg font-bold">{data.result.value}</span>
        </div>
      )}
    </div>
  );
}

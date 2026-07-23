// Small Tailwind-based design system shared across SMARTCOOP.
import { X, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

// The tapping-cut motif from the landing page, reused sparingly as a brand
// echo in the app shell — a thin low-opacity chevron band, not a full divider.
export function HerringboneRule({ className = "", stroke = "#B9701F", height = 10 }) {
  const id = "herr-app-rule";
  return (
    <div aria-hidden="true" className={`relative w-full overflow-hidden ${className}`} style={{ height }}>
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <pattern id={id} width="18" height={height * 1.4} patternUnits="userSpaceOnUse">
            <path
              d={`M0 ${height * 0.7} L9 ${height * 0.1} L18 ${height * 0.7}`}
              fill="none"
              stroke={stroke}
              strokeWidth="1.2"
              opacity="0.4"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </div>
  );
}

// Navigates back to the previous page. Optionally pass `to` for a fixed target.
export function BackButton({ to, label = "Back", className = "" }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className={`mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#787774] transition hover:text-[#346538] ${className}`}
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`max-h-[85vh] w-full ${wide ? "max-w-3xl" : "max-w-xl"} overflow-y-auto rounded-xl border border-[#EAEAEA] bg-white p-6 shadow-[0_20px_60px_rgba(17,17,17,0.14)]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#111111]">{title}</h2>
          <button onClick={onClose} className="text-[#B0AFAB] transition-colors hover:text-[#111111]">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Button({ variant = "primary", className = "", ...props }) {
  const base =
    "btn-press inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#346538]/30 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[#346538] text-white hover:bg-[#2b5330]",
    secondary: "bg-white text-[#2F3437] border border-[#EAEAEA] hover:bg-[#F7F6F3]",
    danger: "bg-[#9F2F2D] text-white hover:bg-[#8a2725]",
    ghost: "text-[#787774] hover:bg-[#F2F1ED] hover:text-[#111111]",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Input({ label, error, className = "", ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-[#2F3437]">
          {label}
          {props.required && <span className="text-[#9F2F2D]"> *</span>}
        </span>
      )}
      <input
        className={`w-full rounded-lg border border-[#EAEAEA] bg-white px-3 py-2 text-sm text-[#2F3437] outline-none transition-colors focus:border-[#346538] focus:ring-1 focus:ring-[#346538] ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-[#9F2F2D]">{error}</span>}
    </label>
  );
}

export function Select({ label, error, children, className = "", ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-[#2F3437]">
          {label}
          {props.required && <span className="text-[#9F2F2D]"> *</span>}
        </span>
      )}
      <select
        className={`w-full rounded-lg border border-[#EAEAEA] bg-white px-3 py-2 text-sm text-[#2F3437] outline-none transition-colors focus:border-[#346538] focus:ring-1 focus:ring-[#346538] ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-xs text-[#9F2F2D]">{error}</span>}
    </label>
  );
}

export function Textarea({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-[#2F3437]">
          {label}
          {props.required && <span className="text-[#9F2F2D]"> *</span>}
        </span>
      )}
      <textarea
        rows={3}
        className={`w-full rounded-lg border border-[#EAEAEA] bg-white px-3 py-2 text-sm text-[#2F3437] outline-none transition-colors focus:border-[#346538] focus:ring-1 focus:ring-[#346538] ${className}`}
        {...props}
      />
    </label>
  );
}

export function Card({ className = "", children }) {
  return (
    <div className={`rounded-xl border border-[#EAEAEA] bg-white p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ children, color = "slate" }) {
  const colors = {
    slate: "bg-[#F2F1ED] text-[#2F3437]",
    green: "bg-[#EDF3EC] text-[#346538]",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-[#FDEBEC] text-[#8a2725]",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#EAEAEA] border-t-[#346538]" />
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="page-head mb-8 flex items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="font-mono-meta mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[#B0AFAB]">
            {eyebrow}
          </p>
        )}
        <h1 className="font-serif-display text-3xl font-light text-[#111111]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#787774]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-none gap-2">{actions}</div>}
    </div>
  );
}

const ACCENTS = {
  emerald: "bg-[#EDF3EC] text-[#346538]",
  green: "bg-[#EDF3EC] text-[#346538]",
  blue: "bg-[#E1F3FE] text-[#1F6C9F]",
  amber: "bg-[#FBF3DB] text-[#956400]",
  red: "bg-[#FDEBEC] text-[#9F2F2D]",
};

export function StatCard({ label, value, icon: Icon, accent = "emerald" }) {
  return (
    <Card className="card-lift flex items-center gap-4">
      {Icon && (
        <div className={`rounded-[10px] p-3 ${ACCENTS[accent] ?? ACCENTS.emerald}`}>
          <Icon size={22} />
        </div>
      )}
      <div>
        <p className="text-sm text-[#787774]">{label}</p>
        <p className="tabular text-2xl font-bold text-[#111111]">{value}</p>
      </div>
    </Card>
  );
}

// Helper badge for membership type.
export function MembershipBadge({ type }) {
  return type === "REGULAR" ? (
    <Badge color="green">Regular</Badge>
  ) : (
    <Badge color="amber">Associate</Badge>
  );
}

// Helper badge for credit-scoring risk band.
const RISK_COLOR = { LOW: "green", MEDIUM: "amber", HIGH: "red" };
export function RiskBadge({ band }) {
  if (!band) return <Badge color="slate">Not assessed</Badge>;
  return <Badge color={RISK_COLOR[band] ?? "slate"}>{band} risk</Badge>;
}

// Page numbers to show: always first & last, plus current ±1, with "…" gaps.
function pageRange(page, pageCount) {
  const pages = new Set([1, pageCount, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("…");
    out.push(sorted[i]);
  }
  return out;
}

// Table pager with numbered pages between Previous / Next. Nothing when 1 page.
export function Pagination({ page, pageCount, onPage }) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-2">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      {pageRange(page, pageCount).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-[#B0AFAB]">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "primary" : "secondary"}
            onClick={() => onPage(p)}
            className="min-w-9 px-3"
          >
            {p}
          </Button>
        )
      )}
      <Button variant="secondary" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </div>
  );
}

// Circular profile photo with an initials fallback when no photo is set.
export function Avatar({ src, name = "", size = 40 }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return (
    <span
      className="inline-flex flex-none items-center justify-center overflow-hidden rounded-full bg-[#EDF3EC] font-medium text-[#346538]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials || "—"
      )}
    </span>
  );
}

// Helper badge for the Dynamic Member Categorization result.
const CATEGORY_COLOR = { ACTIVE: "green", MODERATE: "amber", INACTIVE: "red", NOT_APPLICABLE: "slate" };
const CATEGORY_LABEL = {
  ACTIVE: "Active",
  MODERATE: "Moderate",
  INACTIVE: "Inactive",
  NOT_APPLICABLE: "N/A",
};
export function CategoryBadge({ category }) {
  if (!category) return <Badge color="slate">Uncategorized</Badge>;
  return <Badge color={CATEGORY_COLOR[category] ?? "slate"}>{CATEGORY_LABEL[category] ?? category}</Badge>;
}

// Label/value pair used in review-modal detail grids.
export function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-[#B0AFAB]">{label}</p>
      <p className="text-sm font-medium text-[#2F3437]">{value || "—"}</p>
    </div>
  );
}

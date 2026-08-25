// Small Tailwind-based design system shared across SMARTCOOP.
import { useEffect, useRef, useState } from "react";
import { X, ArrowLeft, ChevronDown, Search } from "lucide-react";
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
      className={`focus-ring mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#787774] transition hover:text-[#346538] ${className}`}
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}

// On phones this is a bottom sheet (thumb-reachable, full width); from `sm` up
// it is a centred dialog. Escape closes it and the page behind it stops
// scrolling, so the modal is the only thing the user can move.
export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[var(--radius-surface)] border border-[var(--line)] bg-white shadow-[var(--shadow-overlay)] sm:max-h-[85vh] sm:rounded-[var(--radius-surface)] ${
          wide ? "sm:max-w-3xl" : "sm:max-w-xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header so the title and the way out stay reachable in a long form. */}
        <div className="flex flex-none items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-3.5 sm:px-6">
          <h2 className="text-base font-semibold text-[var(--ink)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="focus-ring btn-press -mr-1.5 flex h-9 w-9 flex-none items-center justify-center rounded-[var(--radius-control)] text-[var(--ink-muted)] hover:bg-[var(--sunken)] hover:text-[var(--ink)]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}

// One button vocabulary for the whole shell. `size="lg"` is for member-facing
// primary actions on phones; coarse pointers get a 44px floor either way.
const BTN_SIZES = {
  sm: "h-8 gap-1.5 px-2.5 text-xs",
  md: "h-9 gap-2 px-3.5 text-sm",
  lg: "h-11 gap-2 px-5 text-sm",
};

export function Button({ variant = "primary", size = "md", className = "", ...props }) {
  const base =
    "btn-press focus-ring touch-target inline-flex items-center justify-center rounded-[var(--radius-control)] font-medium whitespace-nowrap disabled:opacity-45 disabled:pointer-events-none";
  const variants = {
    primary: "bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]",
    secondary:
      "border border-[var(--line-strong)] bg-white text-[var(--ink-body)] hover:bg-[var(--sunken)] hover:border-[#cfceca]",
    danger: "bg-[var(--danger)] text-white hover:bg-[#8a2725]",
    ghost: "text-[var(--ink-muted)] hover:bg-[#F2F1ED] hover:text-[var(--ink)]",
  };
  return (
    <button
      type={props.type ?? "button"}
      className={`${base} ${BTN_SIZES[size] ?? BTN_SIZES.md} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

// Shared field chrome, so an input, a select and a textarea are the same control
// with different innards. Error state is announced, not just coloured red.
const FIELD =
  "w-full rounded-[var(--radius-control)] border bg-white px-3 py-2 text-sm text-[var(--ink-body)] outline-none transition-colors placeholder:text-[var(--ink-faint)] disabled:cursor-not-allowed disabled:bg-[var(--sunken)] disabled:text-[var(--ink-muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/25";
const fieldBorder = (error) => (error ? "border-[var(--danger)]" : "border-[var(--line-strong)]");

function FieldShell({ label, error, hint, required, children }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-[var(--ink-body)]">
          {label}
          {required && (
            <span className="text-[var(--danger)]" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs font-medium text-[var(--danger)]">{error}</span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-[var(--ink-muted)]">{hint}</span>
      )}
    </label>
  );
}

export function Input({ label, error, hint, className = "", ...props }) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={props.required}>
      <input
        aria-invalid={error ? true : undefined}
        className={`${FIELD} ${fieldBorder(error)} ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

export function Select({ label, error, hint, children, className = "", ...props }) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={props.required}>
      <select
        aria-invalid={error ? true : undefined}
        className={`${FIELD} ${fieldBorder(error)} cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function Textarea({ label, error, hint, className = "", ...props }) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={props.required}>
      <textarea
        rows={3}
        aria-invalid={error ? true : undefined}
        className={`${FIELD} ${fieldBorder(error)} ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

export function Card({ className = "", children }) {
  return (
    <div
      className={`rounded-[var(--radius-surface)] border border-[var(--line)] bg-white p-4 sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

// Searchable member dropdown: click to open a panel with a search box inside
// that filters by member no. or name, then click a result to select it. A plain
// <select> is unusable against a roster of hundreds. Shared by the delivery form
// and the loan form; `value` / `onChange` take the member id as a string, so it
// drops into the same form state a <Select> was holding.
export function MemberCombobox({ label, members, value, onChange, placeholder = "Select…" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const selected = members.find((m) => String(m.id) === String(value));
  const q = query.trim().toLowerCase();
  // Every whitespace-separated term must hit the number or the name, so a full
  // name matches the way it does in the members list.
  const filtered = q
    ? members.filter((m) => {
        const hay = `${m.memberNo} ${m.firstName} ${m.middleName ?? ""} ${m.lastName}`.toLowerCase();
        return q.split(/\s+/).every((t) => hay.includes(t));
      })
    : members;

  function pick(m) {
    onChange(String(m.id));
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative" ref={ref}>
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-[var(--ink-body)]">{label}</span>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="focus-ring flex w-full items-center justify-between rounded-[var(--radius-control)] border border-[var(--line-strong)] bg-white px-3 py-2 text-left text-sm outline-none transition-colors hover:border-[#cfceca]"
      >
        <span className={`truncate ${selected ? "text-[var(--ink-body)]" : "text-[var(--ink-faint)]"}`}>
          {selected
            ? `${selected.memberNo} — ${selected.firstName} ${selected.lastName}`
            : placeholder}
        </span>
        <ChevronDown size={16} className="ml-2 flex-none text-[var(--ink-muted)]" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-64 overflow-hidden rounded-[var(--radius-control)] border border-[var(--line)] bg-white shadow-[var(--shadow-popover)]">
          <div className="flex items-center gap-2 border-b border-[#F2F1ED] px-3 py-2">
            <Search size={15} className="flex-none text-[var(--ink-muted)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
              placeholder="Search by member no. or name…"
              aria-label="Search members"
              className="w-full text-sm outline-none placeholder:text-[var(--ink-faint)]"
            />
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            {filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => pick(m)}
                  role="option"
                  aria-selected={String(m.id) === String(value)}
                  className={`focus-ring block w-full px-3 py-2 text-left text-sm hover:bg-[var(--brand-tint)] ${
                    String(m.id) === String(value)
                      ? "bg-[var(--brand-tint)] font-medium text-[var(--brand)]"
                      : "text-[var(--ink-body)]"
                  }`}
                >
                  {m.memberNo} — {m.firstName} {m.lastName}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-[var(--ink-muted)]">
                No members match “{query.trim()}”.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// Tables scroll inside their own card instead of being clipped by the page.
// Without this the right-hand columns are simply unreachable on a phone.
export function DataTable({ children, className = "" }) {
  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <table className={`data-table ${className}`}>{children}</table>
    </div>
  );
}

// The row a table shows when it has nothing to show. Says what would be here
// and, where there is one, how to put it there.
export function EmptyRow({ colSpan, title, hint, action }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <p className="text-sm font-medium text-[var(--ink-body)]">{title}</p>
        {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--ink-muted)]">{hint}</p>}
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </td>
    </tr>
  );
}

// Loading placeholder shaped like the table that's coming, so the page doesn't
// jump when the data lands.
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="p-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 py-2.5" style={{ opacity: 1 - r * 0.1 }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="skeleton h-4 flex-1"
              style={c === 0 ? { maxWidth: 120 } : undefined}
            />
          ))}
        </div>
      ))}
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
    <div className="page-head mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-mono-meta mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
            {eyebrow}
          </p>
        )}
        <h1 className="font-serif-display text-2xl font-light text-[var(--ink)] sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--ink-faint)]">
            {subtitle}
          </p>
        )}
      </div>
      {/* Wraps on a phone instead of squeezing the title into one column. */}
      {actions && <div className="flex flex-wrap gap-2 sm:flex-none">{actions}</div>}
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

// The figure is the point: label above in muted small caps, value large and
// tabular so a column of these lines up. Icon is a quiet marker, not the hero.
export function StatCard({ label, value, hint, icon: Icon, accent = "emerald" }) {
  return (
    <Card className="flex items-center gap-3 sm:gap-4">
      {Icon && (
        <div
          aria-hidden="true"
          className={`flex h-10 w-10 flex-none items-center justify-center rounded-[var(--radius-control)] ${
            ACCENTS[accent] ?? ACCENTS.emerald
          }`}
        >
          <Icon size={19} />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
          {label}
        </p>
        <p className="tabular mt-0.5 truncate text-xl font-semibold text-[var(--ink)] sm:text-2xl">
          {value}
        </p>
        {hint && <p className="mt-0.5 truncate text-xs text-[var(--ink-faint)]">{hint}</p>}
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
// On a phone the numbers give way to a "Page 2 of 9" readout so the control
// never wraps into three lines of tiny targets.
export function Pagination({ page, pageCount, onPage }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-2 sm:justify-end">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>

      <span className="tabular text-sm text-[var(--ink-muted)] sm:hidden">
        Page {page} of {pageCount}
      </span>

      <div className="hidden items-center gap-1.5 sm:flex">
        {pageRange(page, pageCount).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-sm text-[var(--ink-muted)]">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "primary" : "secondary"}
              onClick={() => onPage(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
              className="tabular min-w-9 px-2"
            >
              {p}
            </Button>
          )
        )}
      </div>

      <Button variant="secondary" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </nav>
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
      <p className="text-xs text-[#5F5E5A]">{label}</p>
      <p className="text-sm font-medium text-[#2F3437]">{value || "—"}</p>
    </div>
  );
}

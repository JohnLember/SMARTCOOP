// One confirmation dialog for the whole app, in place of the browser's confirm().
//
// The native dialog cannot be styled, cannot show what is about to be destroyed,
// cannot show progress while the work happens, and looks like it belongs to the
// browser rather than to SMARTCOOP. This is the same idea wearing the app's own
// clothes: tokens from index.css, the shared Button, the same bottom-sheet
// behaviour on phones that Modal already uses.
//
// Usage — a near drop-in for `confirm()`:
//
//   const confirm = useConfirm();
//   if (!(await confirm({ title: "Delete this?", tone: "danger" }))) return;
//
// Pass `onConfirm` instead when the dialog should stay open and show progress
// while the work runs, and surface a failure in place rather than closing:
//
//   await confirm({
//     title: "Void payment LP-0004?",
//     confirmLabel: "Void payment",
//     tone: "danger",
//     onConfirm: () => api.post(`/finance/loan-payments/${id}/void`),
//   });
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, HelpCircle, Loader2 } from "lucide-react";
import { apiError } from "../lib/api";
import { Button, Input } from "./ui";

const EXIT_MS = 140; // must match .confirm-panel[data-closing] in index.css

const TONES = {
  danger: {
    icon: AlertTriangle,
    confirmVariant: "danger",
    badge: "bg-[var(--danger-tint)] text-[var(--danger)]",
  },
  default: {
    icon: HelpCircle,
    confirmVariant: "primary",
    badge: "bg-[var(--brand-tint)] text-[var(--brand)]",
  },
};

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  // One request at a time — a confirmation that could be interrupted by another
  // confirmation is a confirmation nobody read.
  const [request, setRequest] = useState(null);

  const confirm = useCallback(
    (options) =>
      // The id keys the dialog, so each request mounts fresh rather than
      // inheriting the previous one's typed phrase or error.
      new Promise((resolve) => setRequest({ id: Date.now(), options, resolve })),
    []
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request &&
        createPortal(
          <ConfirmDialog
            key={request.id}
            options={request.options}
            onSettle={(result) => {
              request.resolve(result);
              setRequest(null);
            }}
          />,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}

function ConfirmDialog({ options, onSettle }) {
  const {
    title,
    description,
    details,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    busyLabel,
    tone = "danger",
    // Typing a phrase is reserved for the handful of actions that cascade into
    // other records. Everywhere else it is friction without a payoff.
    confirmPhrase,
    onConfirm,
  } = options;

  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [typed, setTyped] = useState("");

  const panelRef = useRef(null);
  const cancelRef = useRef(null);
  const phraseRef = useRef(null);
  // Where focus was before the dialog took it, so it can be handed back.
  const openerRef = useRef(null);
  const settledRef = useRef(false);

  const toneCfg = TONES[tone] ?? TONES.danger;
  const Icon = toneCfg.icon;
  const phraseOk = !confirmPhrase || typed.trim().toUpperCase() === confirmPhrase.toUpperCase();

  const close = useCallback(
    (result) => {
      if (settledRef.current) return;
      settledRef.current = true;
      setClosing(true);
      // Let the exit animation finish before the dialog leaves the tree; the
      // promise is settled at the same moment so the caller is never held up by
      // an animation.
      setTimeout(() => onSettle(result), EXIT_MS);
    },
    [onSettle]
  );

  // Focus starts on Cancel, never on the confirm button: a stray Enter or Space
  // arriving right as the dialog opens then does the safe thing. The phrase box,
  // when there is one, is the exception — it is the thing to interact with.
  useEffect(() => {
    openerRef.current = document.activeElement;
    const target = phraseRef.current ?? cancelRef.current;
    target?.focus();

    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = prevOverflow;
      // Hand focus back to whatever opened this, so keyboard users resume where
      // they left off instead of at the top of the document.
      const opener = openerRef.current;
      if (opener?.isConnected) opener.focus?.();
    };
  }, []);

  // Escape cancels, and never confirms. Captured rather than bubbled so it does
  // not also reach a Modal underneath — several of these are opened from inside
  // one, and a single Escape must not close both.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (!busy) close(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [busy, close]);

  // Keep Tab inside the dialog. Without this the next Tab lands on the page
  // behind, where the user can operate controls the dialog is asking about.
  function onKeyDown(e) {
    if (e.key !== "Tab") return;
    const focusables = panelRef.current?.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables?.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  async function handleConfirm() {
    if (!phraseOk || busy) return;

    if (!onConfirm) return close(true);

    setError("");
    setBusy(true);
    try {
      await onConfirm();
    } catch (err) {
      // Stay open and say what went wrong: closing here would hide the failure
      // behind a dialog the user believes succeeded.
      setError(apiError(err));
      setBusy(false);
      return;
    }
    setBusy(false);
    close(true);
  }

  return (
    <div
      className="confirm-scrim fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      data-closing={closing}
      // Clicking away cancels — the safe direction. While the action is running
      // there is nothing safe to do but wait.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) close(false);
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        onKeyDown={onKeyDown}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={description ? "confirm-description" : undefined}
        data-closing={closing}
        className="confirm-panel flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[var(--radius-surface)] border border-[var(--line)] bg-white shadow-[var(--shadow-overlay)] sm:max-h-[85vh] sm:max-w-md sm:rounded-[var(--radius-surface)]"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="flex gap-4">
            <span
              aria-hidden="true"
              className={`flex h-10 w-10 flex-none items-center justify-center rounded-full ${toneCfg.badge}`}
            >
              <Icon size={20} strokeWidth={2.25} />
            </span>

            <div className="min-w-0 flex-1">
              <h2 id="confirm-title" className="text-base font-semibold text-[var(--ink)]">
                {title}
              </h2>
              {description && (
                <p id="confirm-description" className="mt-1.5 text-sm text-[var(--ink-body)]">
                  {description}
                </p>
              )}

              {/* What exactly is at stake, as facts rather than prose. */}
              {details?.length > 0 && (
                <dl className="mt-3 divide-y divide-[var(--line)] rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--sunken)] px-3 text-sm">
                  {details.map((d) => (
                    <div key={d.label} className="flex items-baseline justify-between gap-4 py-2">
                      <dt className="text-[var(--ink-muted)]">{d.label}</dt>
                      <dd className="tabular text-right font-medium text-[var(--ink-body)]">
                        {d.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {confirmPhrase && (
                <div className="mt-4">
                  <Input
                    ref={phraseRef}
                    label={`Type ${confirmPhrase} to confirm`}
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    disabled={busy}
                    autoComplete="off"
                    spellCheck="false"
                    aria-describedby="confirm-phrase-hint"
                    hint="This one cannot be undone, so it asks for the word in full."
                  />
                </div>
              )}

              {error && (
                <p
                  role="alert"
                  className="mt-3 rounded-[var(--radius-control)] bg-[var(--danger-tint)] px-3 py-2 text-sm text-[var(--danger)]"
                >
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Confirm sits last so Tab reaches Cancel first, and so the eye lands on
            the way out before the way through. */}
        <div className="flex flex-none flex-col-reverse gap-2 border-t border-[var(--line)] bg-[var(--sunken)] px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6">
          <Button ref={cancelRef} variant="secondary" onClick={() => close(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={toneCfg.confirmVariant}
            onClick={handleConfirm}
            disabled={busy || !phraseOk}
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {busy ? (busyLabel ?? "Working…") : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

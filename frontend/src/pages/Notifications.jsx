import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import api, { apiError } from "../lib/api";
import { toast } from "react-toastify";
import { Card, Spinner, PageHeader, Badge, Button } from "../components/ui";
import { formatDateTime } from "../lib/format";
import { Check, ChevronRight, CalendarClock, Trash2, X } from "lucide-react";

// Notifications carry no link column, and every one produced today comes from the
// loan-application flow. Route by audience: staff review applications on the queue
// page, a member sees their own application status on their profile. Anything that
// doesn't match stays plain text rather than navigating somewhere wrong.
function targetFor(n) {
  if (!/loan application/i.test(n.title)) return null;
  return n.recipientMemberId ? "/me" : "/loan-applications";
}

// Each notification is created at the moment of the event it announces, so
// dateSent is always the right value — but not always the same event. Only the
// approval notice marks a loan actually being issued; the staff queue notice
// marks the member submitting. Labelling everything "Date issued" claimed a loan
// existed where none had been granted yet.
function dateLabelFor(n) {
  if (/approved/i.test(n.title)) return "Date issued";
  if (/new loan application/i.test(n.title)) return "Date submitted";
  if (/rejected/i.test(n.title)) return "Date reviewed";
  return "Received";
}

// Swipe geometry. The row travels right at most this far, and a release past
// OPEN_AT (or a fast enough flick) leaves the delete button showing.
const SWIPE_MAX = 104;
const OPEN_AT = 56;
// px per ms — a quick flick counts even if it never reached OPEN_AT.
const FLICK_VELOCITY = 0.11;
// Enter stagger, capped so a long list never feels slow to appear.
const STAGGER_MS = 40;
const STAGGER_CAP = 6;

export default function Notifications() {
  const [list, setList] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  // Ids mid-exit-animation: rendered, but already gone as far as the user cares.
  const [leaving, setLeaving] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await api.get("/notifications");
    setList(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id) {
    await api.patch(`/notifications/${id}/read`);
    await load();
    // Tell the sidebar badge to refresh its unread count right away.
    window.dispatchEvent(new Event("notifications:changed"));
  }

  // Plays the exit animation first, then deletes. The rows are removed from
  // state only after the server confirms, so a failed delete puts them back.
  async function remove(ids) {
    if (!ids.length || busy) return;
    setBusy(true);
    setLeaving(new Set(ids));
    try {
      await new Promise((r) => setTimeout(r, 200)); // matches notif-leave
      const res = await api.post("/notifications/delete", { ids });
      setList((prev) => prev.filter((n) => !ids.includes(n.id)));
      setSelected(new Set());
      window.dispatchEvent(new Event("notifications:changed"));
      toast.success(
        res.data.deleted === 1 ? "Notification deleted" : `${res.data.deleted} notifications deleted`
      );
    } catch (err) {
      toast.error(apiError(err));
      await load();
    } finally {
      setLeaving(new Set());
      setBusy(false);
    }
  }

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (!list) return <Spinner />;

  const allSelected = list.length > 0 && selected.size === list.length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Announcements and messages. Swipe a row right, or select several, to delete."
      />

      {list.length > 0 && (
        <Card className="mb-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* The checkbox only ever feeds the delete button beside it, so the
                label says so outright rather than leaving "Select all" to be
                read as marking things read. */}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#2F3437]">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() =>
                  setSelected(allSelected ? new Set() : new Set(list.map((n) => n.id)))
                }
                className="h-4 w-4 accent-[#346538]"
              />
              {selected.size > 0 ? (
                <span>
                  <span className="font-medium text-[#9F2F2D]">{selected.size}</span> selected to
                  delete
                </span>
              ) : (
                <span>
                  Select all to delete{" "}
                  <span className="text-[#5F5E5A]">({list.length})</span>
                </span>
              )}
            </label>

            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setSelected(new Set())} disabled={busy}>
                  <X size={16} />
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => remove([...selected])} disabled={busy}>
                  <Trash2 size={16} />
                  Delete {selected.size}
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      <div>
        {list.length === 0 && (
          <Card>
            <p className="text-center text-[#5F5E5A]">No notifications yet.</p>
          </Card>
        )}
        {list.map((n, i) => (
          <NotificationRow
            key={n.id}
            n={n}
            index={i}
            checked={selected.has(n.id)}
            onToggle={() => toggle(n.id)}
            onMarkRead={() => markRead(n.id)}
            onDelete={() => remove([n.id])}
            leaving={leaving.has(n.id)}
            disabled={busy}
          />
        ))}
      </div>
    </div>
  );
}

function NotificationRow({ n, index, checked, onToggle, onMarkRead, onDelete, leaving, disabled }) {
  const surfaceRef = useRef(null);
  const drag = useRef(null);
  const [open, setOpen] = useState(false);
  const to = targetFor(n);

  // The surface follows the pointer directly — writing transform on the element
  // rather than a CSS variable on a parent keeps the restyle to this one node.
  function setX(x, animate) {
    const el = surfaceRef.current;
    if (!el) return;
    el.dataset.dragging = animate ? "false" : "true";
    el.style.transform = x ? `translateX(${x}px)` : "";
  }

  function onPointerDown(e) {
    // Ignore secondary touches mid-drag, and let the controls handle their own clicks.
    if (drag.current || e.button !== 0 || e.target.closest("button,input,a")) return;
    drag.current = { startX: e.clientX, startY: e.clientY, at: Date.now(), x: 0, axis: null };
  }

  function onPointerMove(e) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    // Lock to an axis once: a vertical intent is a page scroll, not a swipe.
    if (!d.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (d.axis === "x") e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    if (d.axis !== "x") return;

    const base = open ? SWIPE_MAX : 0;
    let x = base + dx;
    // Right only, and past the maximum it gets progressively harder to pull —
    // real things slow down rather than hitting an invisible wall.
    if (x < 0) x = 0;
    if (x > SWIPE_MAX) x = SWIPE_MAX + (x - SWIPE_MAX) * 0.25;
    d.x = x;
    setX(x, false);
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    if (!d || d.axis !== "x") return;
    const velocity = Math.abs(d.x - (open ? SWIPE_MAX : 0)) / Math.max(1, Date.now() - d.at);
    const shouldOpen = d.x > OPEN_AT || (velocity > FLICK_VELOCITY && d.x > 12);
    setOpen(shouldOpen);
    setX(shouldOpen ? SWIPE_MAX : 0, true);
  }

  function close() {
    setOpen(false);
    setX(0, true);
  }

  const body = (
    <>
      <div className="mb-1 flex items-center gap-2">
        <h3 className="font-semibold text-[#111111] group-hover:underline">{n.title}</h3>
        {n.status === "UNREAD" && <Badge color="green">New</Badge>}
      </div>
      <p className="text-sm text-[#787774]">{n.message}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1 text-[#787774]">
          <CalendarClock size={13} className="text-[#5F5E5A]" />
          <span className="text-[#5F5E5A]">{dateLabelFor(n)}:</span>
          <span className="font-medium text-[#2F3437]">{formatDateTime(n.dateSent)}</span>
        </span>
        {n.sender?.username && <span className="text-[#5F5E5A]">· From {n.sender.username}</span>}
        {to && (
          <span className="inline-flex items-center font-medium text-[#346538]">
            · View
            <ChevronRight size={13} />
          </span>
        )}
      </div>
    </>
  );

  return (
    <div
      className={`notif-row relative mb-3 ${leaving ? "notif-row-leaving" : "notif-row-enter"}`}
      style={{ "--enter-delay": `${Math.min(index, STAGGER_CAP) * STAGGER_MS}ms` }}
    >
      {/* Revealed underneath as the row slides right. */}
      <div className="absolute inset-y-0 left-0 flex w-26 items-center justify-center">
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          aria-label={`Delete notification: ${n.title}`}
          tabIndex={open ? 0 : -1}
          className={`focus-ring btn-press notif-swipe-action flex h-11 w-11 items-center justify-center rounded-full bg-[#9F2F2D] text-white shadow-sm ${
            open ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div
        ref={surfaceRef}
        className="notif-row-surface"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(e) => e.key === "Escape" && open && close()}
      >
        <Card
          className={`${n.status === "UNREAD" ? "border-[#C4D8C3] bg-[#EDF3EC]/40" : ""} ${
            checked ? "ring-1 ring-[#346538]" : ""
          }`}
        >
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={checked}
              onChange={onToggle}
              aria-label={`Select to delete: ${n.title}`}
              className="mt-1 h-4 w-4 flex-none accent-[#346538]"
            />

            {to ? (
              // Opening it counts as reading it, so the badge clears on the way out.
              <Link
                to={to}
                onClick={() => n.status === "UNREAD" && onMarkRead()}
                className="group min-w-0 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#346538]"
              >
                {body}
              </Link>
            ) : (
              <div className="min-w-0 flex-1">{body}</div>
            )}

            {/* Nothing may enter or leave this row while the swipe is open —
                inserting a control here would resize the message beside it and
                make the row visibly jump as it slides back. */}
            {n.status === "UNREAD" && (
              <div className="flex-none">
                <Button variant="ghost" onClick={onMarkRead}>
                  <Check size={16} />
                  Mark read
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

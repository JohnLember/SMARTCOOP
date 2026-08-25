import { useEffect, useState } from "react";
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
        subtitle="Announcements and messages. Select one or more to delete."
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
            leaving={leaving.has(n.id)}
          />
        ))}
      </div>
    </div>
  );
}

function NotificationRow({ n, index, checked, onToggle, onMarkRead, leaving }) {
  const to = targetFor(n);

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
      className={`notif-row mb-3 ${leaving ? "notif-row-leaving" : "notif-row-enter"}`}
      style={{ "--enter-delay": `${Math.min(index, STAGGER_CAP) * STAGGER_MS}ms` }}
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
  );
}

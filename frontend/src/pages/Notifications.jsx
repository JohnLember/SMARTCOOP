import { useEffect, useState } from "react";
import { Link } from "react-router";
import api from "../lib/api";
import { Card, Spinner, PageHeader, Badge, Button } from "../components/ui";
import { formatDateTime } from "../lib/format";
import { Check, ChevronRight, CalendarClock } from "lucide-react";

// Notifications carry no link column, and every one produced today comes from the
// loan-application flow. Route by audience: staff review applications on the queue
// page, a member sees their own application status on their profile. Anything that
// doesn't match stays plain text rather than navigating somewhere wrong.
function targetFor(n) {
  if (!/loan application/i.test(n.title)) return null;
  return n.recipientMemberId ? "/me" : "/loan-applications";
}

export default function Notifications() {
  const [list, setList] = useState(null);

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

  if (!list) return <Spinner />;

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Announcements and messages" />
      <div className="space-y-3">
        {list.length === 0 && (
          <Card>
            <p className="text-center text-[#B0AFAB]">No notifications yet.</p>
          </Card>
        )}
        {list.map((n) => {
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
                  <CalendarClock size={13} className="text-[#B0AFAB]" />
                  <span className="text-[#B0AFAB]">Date issued:</span>
                  <span className="font-medium text-[#2F3437]">{formatDateTime(n.dateSent)}</span>
                </span>
                {n.sender?.username && (
                  <span className="text-[#B0AFAB]">· From {n.sender.username}</span>
                )}
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
            <Card key={n.id} className={n.status === "UNREAD" ? "border-[#C4D8C3] bg-[#EDF3EC]/40" : ""}>
              <div className="flex items-start justify-between gap-4">
                {to ? (
                  // Opening it counts as reading it, so the badge clears on the way out.
                  <Link
                    to={to}
                    onClick={() => n.status === "UNREAD" && markRead(n.id)}
                    className="group min-w-0 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#346538]"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="min-w-0 flex-1">{body}</div>
                )}
                {n.status === "UNREAD" && (
                  <Button variant="ghost" onClick={() => markRead(n.id)}>
                    <Check size={16} />
                    Mark read
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

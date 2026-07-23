import { useEffect, useState } from "react";
import api from "../lib/api";
import { Card, Spinner, PageHeader, Badge, Button } from "../components/ui";
import { formatDateTime } from "../lib/format";
import { Check } from "lucide-react";

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
        {list.map((n) => (
          <Card key={n.id} className={n.status === "UNREAD" ? "border-[#C4D8C3] bg-[#EDF3EC]/40" : ""}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="font-semibold text-[#111111]">{n.title}</h3>
                  {n.status === "UNREAD" && <Badge color="green">New</Badge>}
                </div>
                <p className="text-sm text-[#787774]">{n.message}</p>
                <p className="mt-2 text-xs text-[#B0AFAB]">
                  {n.sender?.username ? `From ${n.sender.username} · ` : ""}
                  {formatDateTime(n.dateSent)}
                </p>
              </div>
              {n.status === "UNREAD" && (
                <Button variant="ghost" onClick={() => markRead(n.id)}>
                  <Check size={16} />
                  Mark read
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

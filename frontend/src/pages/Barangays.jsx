import { useEffect, useState } from "react";
import { Link } from "react-router";
import api, { apiError } from "../lib/api";
import { Card, Spinner, PageHeader, Modal, Badge, MembershipBadge } from "../components/ui";
import { ChevronRight } from "lucide-react";

export default function Barangays() {
  const [list, setList] = useState(null);
  const [selected, setSelected] = useState(null);
  const [members, setMembers] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await api.get("/barangays");
    setList(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  // The members list already filters by barangay, so opening a row is just that
  // query — no new endpoint. Fetched on click rather than in an effect so the
  // modal never renders a stale barangay's members.
  function openBarangay(b) {
    setSelected(b);
    setMembers(null);
    setError("");
    api
      .get("/members", { params: { barangayId: b.id, all: 1 } })
      .then((res) => setMembers(res.data.items))
      .catch((err) => setError(apiError(err)));
  }

  return (
    <div>
      <PageHeader
        title="Barangays"
        subtitle="Geographic areas for members and loading batches. Select a barangay to see its members."
      />

      {!list ? (
        <Spinner />
      ) : (
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F6F3] text-left text-[#787774]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Members</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F1ED]">
              {list.map((b) => (
                <tr
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openBarangay(b)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openBarangay(b);
                    }
                  }}
                  className="group cursor-pointer outline-none hover:bg-[#F7F6F3] focus-visible:bg-[#EDF3EC]"
                >
                  <td className="px-4 py-3 font-medium text-[#2F3437]">{b.name}</td>
                  <td className="px-4 py-3 text-[#787774]">{b.code ?? "—"}</td>
                  <td className="px-4 py-3 text-[#787774]">{b._count.members}</td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight
                      size={16}
                      className="ml-auto text-[#D6D5D1] transition-colors group-hover:text-[#346538]"
                    />
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-[#B0AFAB]">
                    No barangays yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.name} — members` : ""}
        wide
      >
        {error ? (
          <p className="rounded-lg bg-[#FDEBEC] px-3 py-2 text-sm text-[#8a2725]">{error}</p>
        ) : !members ? (
          <Spinner />
        ) : members.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#B0AFAB]">
            No members are assigned to this barangay yet.
          </p>
        ) : (
          <>
            <p className="mb-3 text-sm text-[#787774]">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
            <div className="overflow-hidden rounded-lg border border-[#EAEAEA]">
              <table className="w-full text-sm">
                <thead className="bg-[#F7F6F3] text-left text-[#787774]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Member No.</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Account status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F1ED]">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-[#F7F6F3]">
                      <td className="px-3 py-2">
                        <Link
                          to={`/members/${m.id}`}
                          className="font-medium text-[#346538] hover:underline"
                        >
                          {m.memberNo}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-[#2F3437]">
                        {m.firstName} {m.lastName}
                      </td>
                      <td className="px-3 py-2">
                        <MembershipBadge type={m.membershipType} />
                      </td>
                      <td className="px-3 py-2">
                        <Badge color={m.status === "ACTIVE" ? "green" : "slate"}>{m.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

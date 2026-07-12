import { useEffect, useState } from "react";
import api from "../lib/api";
import { Card, Spinner, PageHeader } from "../components/ui";

export default function Barangays() {
  const [list, setList] = useState(null);

  async function load() {
    const res = await api.get("/barangays");
    setList(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader title="Barangays" subtitle="Geographic areas for members and loading batches" />

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
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F1ED]">
              {list.map((b) => (
                <tr key={b.id} className="hover:bg-[#F7F6F3]">
                  <td className="px-4 py-3 font-medium text-[#2F3437]">{b.name}</td>
                  <td className="px-4 py-3 text-[#787774]">{b.code ?? "—"}</td>
                  <td className="px-4 py-3 text-[#787774]">{b._count.members}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

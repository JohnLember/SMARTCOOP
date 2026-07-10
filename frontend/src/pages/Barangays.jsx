import { useEffect, useState } from "react";
import api, { apiError } from "../lib/api";
import { Button, Card, Input, Spinner, PageHeader } from "../components/ui";
import { Plus } from "lucide-react";

export default function Barangays() {
  const [list, setList] = useState(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await api.get("/barangays");
    setList(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/barangays", { name, code: code || null });
      setName("");
      setCode("");
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Barangays" subtitle="Geographic areas for members and loading batches" />

      <Card className="mb-4">
        <form onSubmit={add} className="flex items-end gap-3">
          <div className="flex-1">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="w-40">
            <Input label="Code (optional)" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy}>
            <Plus size={16} />
            Add
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-[#9F2F2D]">{error}</p>}
      </Card>

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

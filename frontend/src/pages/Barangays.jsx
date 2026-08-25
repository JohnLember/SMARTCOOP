import { useEffect, useState } from "react";
import api from "../lib/api";
import { Spinner, PageHeader } from "../components/ui";
import BarangayBrowser from "../components/BarangayBrowser";

export default function Barangays() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    // There is no staff equivalent of the MAO's members-by-barangay endpoint, so
    // the same shape is assembled from two lists staff already have: every
    // barangay (so empty ones still get a page) joined with every member.
    Promise.all([api.get("/barangays"), api.get("/members", { params: { all: 1 } })]).then(
      ([bRes, mRes]) => {
        const byBarangay = new Map();
        for (const m of mRes.data.items) {
          const key = m.barangay?.id;
          if (key == null) continue;
          if (!byBarangay.has(key)) byBarangay.set(key, []);
          byBarangay.get(key).push(m);
        }
        setData(
          bRes.data.map((b) => ({
            id: b.id,
            name: b.name,
            code: b.code,
            members: (byBarangay.get(b.id) ?? []).sort((a, z) =>
              a.lastName.localeCompare(z.lastName)
            ),
          }))
        );
      }
    );
  }, []);

  if (!data) return <Spinner />;

  const assigned = data.reduce((s, b) => s + b.members.length, 0);

  return (
    <div>
      <PageHeader
        title="Barangays"
        subtitle={`${assigned} member${assigned === 1 ? "" : "s"} assigned across ${data.length} barangay${data.length === 1 ? "" : "s"}`}
      />
      <BarangayBrowser data={data} page={page} onPage={setPage} />
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router";
import api, { apiError } from "../../lib/api";
import { toast } from "react-toastify";
import {
  Button,
  Card,
  Input,
  Select,
  Spinner,
  PageHeader,
  MembershipBadge,
  CategoryBadge,
  Badge,
  Avatar,
  Pagination,
} from "../../components/ui";
import { Plus, Search, RefreshCw, X } from "lucide-react";

export default function MembersList() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [barangayId, setBarangayId] = useState("");
  const [barangays, setBarangays] = useState([]);
  const [page, setPage] = useState(1);
  const [evaluating, setEvaluating] = useState(false);

  const PAGE_SIZE = 10;

  async function load({ search: s = search, type: t = type, barangayId: b = barangayId, page: p = page } = {}) {
    setLoading(true);
    try {
      const params = { page: p, pageSize: PAGE_SIZE };
      if (s) params.search = s;
      if (t) params.membershipType = t;
      if (b) params.barangayId = b;
      const res = await api.get("/members", { params });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.get("/barangays").then((res) => setBarangays(res.data));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Any filter change (dropdown, search submit, or clear) resets to page 1.
  function applyFilters(patch = {}) {
    if (patch.type !== undefined) setType(patch.type);
    if (patch.barangayId !== undefined) setBarangayId(patch.barangayId);
    if (patch.search !== undefined) setSearch(patch.search);
    setPage(1);
    load({ ...patch, page: 1 });
  }

  function clearFilters() {
    applyFilters({ search: "", type: "", barangayId: "" });
  }

  function goPage(p) {
    setPage(p);
    load({ page: p });
  }

  const hasFilters = search || type || barangayId;
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  async function evaluateAll() {
    setEvaluating(true);
    try {
      const res = await api.post("/members/evaluate-all");
      await load();
      toast.success(`Categorized ${res.data?.evaluated ?? "all"} members`);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Members"
        subtitle="Manage cooperative members and membership progression"
        actions={
          <>
            <Button variant="secondary" onClick={evaluateAll} disabled={evaluating}>
              <RefreshCw size={16} className={evaluating ? "animate-spin" : ""} />
              Categorize all
            </Button>
            <Link to="/members/new">
              <Button>
                <Plus size={16} />
                New member
              </Button>
            </Link>
          </>
        }
      />

      <Card className="mb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters();
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-48">
            <Input
              label="Search"
              placeholder="Name or member no."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-44">
            <Select label="Type" value={type} onChange={(e) => applyFilters({ type: e.target.value })}>
              <option value="">All types</option>
              <option value="REGULAR">Regular</option>
              <option value="ASSOCIATE">Associate</option>
            </Select>
          </div>
          <div className="w-48">
            <Select
              label="Barangay"
              value={barangayId}
              onChange={(e) => applyFilters({ barangayId: e.target.value })}
            >
              <option value="">All barangays</option>
              {barangays.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="secondary">
            <Search size={16} />
            Filter
          </Button>
          {hasFilters && (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              <X size={16} />
              Clear filter
            </Button>
          )}
        </form>
      </Card>

      {loading ? (
        <Spinner />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F6F3] text-left text-[#787774]">
              <tr>
                <th className="px-4 py-3 font-medium">Member No.</th>
                <th className="px-4 py-3 font-medium">Photo</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Barangay</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Activity Score</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F1ED]">
              {data?.items.map((m) => (
                <tr key={m.id} className="hover:bg-[#F7F6F3]">
                  <td className="px-4 py-3">
                    <Link to={`/members/${m.id}`} className="font-medium text-[#346538] hover:underline">
                      {m.memberNo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Avatar src={m.profilePhoto} name={`${m.firstName} ${m.lastName}`} size={36} />
                  </td>
                  <td className="px-4 py-3">
                    {m.firstName} {m.lastName}
                  </td>
                  <td className="px-4 py-3 text-[#787774]">{m.barangay?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <MembershipBadge type={m.membershipType} />
                  </td>
                  <td className="px-4 py-3">
                    <CategoryBadge category={m.activityCategory} />
                  </td>
                  <td className="px-4 py-3 text-[#787774]">
                    {m.activityScore != null ? m.activityScore : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={m.status === "ACTIVE" ? "green" : "slate"}>{m.status}</Badge>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[#B0AFAB]">
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
      {data && (
        <>
          <Pagination page={page} pageCount={pageCount} onPage={goPage} />
          <p className="mt-3 text-sm text-[#787774]">
            {data.total} member{data.total !== 1 ? "s" : ""} total
          </p>
        </>
      )}
    </div>
  );
}

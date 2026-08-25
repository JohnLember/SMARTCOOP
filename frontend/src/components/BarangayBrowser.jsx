import { useState } from "react";
import { Card, Button, Input, Select, Badge, MembershipBadge, DataTable, Pagination } from "./ui";
import { usePagination } from "../lib/usePagination";
import { formatDate } from "../lib/format";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZES = [10, 30, 50, 100];

// One barangay at a time, with Previous / Next and a jump-to-name dropdown, and
// the barangay's members in a searchable, paged table.
//
// Shared by the MAO's "Members by Barangay" report and the staff Barangays page
// so the two cannot drift apart. `data` is the shape both sides already produce:
//   [{ id, name, code?, members: [{ id, memberNo, firstName, lastName,
//                                   membershipType, dateJoined }] }]
// `page` / `onPage` are owned by the parent so the page can also act on the
// barangay currently on screen (the MAO report offers to export just that one).
export default function BarangayBrowser({ data, page, onPage }) {
  // Carried between barangays; the search box is not (see goBarangay).
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  const list = data ?? [];
  const pageCount = Math.max(1, list.length);
  const safePage = Math.min(Math.max(1, page), pageCount);
  const barangay = list[safePage - 1];

  // Every whitespace-separated term must hit the member no. or the name, so
  // "garcia jose" and "jose garcia" both match — the rule the members list uses.
  const members = barangay?.members ?? [];
  const q = search.trim().toLowerCase();
  const filtered = q
    ? members.filter((m) => {
        const hay = `${m.memberNo} ${m.firstName} ${m.lastName}`.toLowerCase();
        return q.split(/\s+/).every((t) => hay.includes(t));
      })
    : members;

  const {
    page: rowPage,
    setPage: setRowPage,
    pageCount: rowCount,
    pageItems: rows,
  } = usePagination(filtered, pageSize);

  // Moving barangay clears the filter — otherwise the next barangay can look
  // empty because of a term left over from the previous one.
  function goBarangay(n) {
    onPage(n);
    setSearch("");
    setRowPage(1);
  }

  function onSearch(value) {
    setSearch(value);
    setRowPage(1);
  }

  function onPageSize(size) {
    setPageSize(size);
    setRowPage(1);
  }

  if (!barangay)
    return (
      <Card>
        <p className="text-[var(--ink-muted)]">No barangays on record.</p>
      </Card>
    );

  return (
    <>
      <BarangayNav page={safePage} pageCount={pageCount} onPage={goBarangay} barangays={list} />

      <Card className="mt-4 p-0">
        <div className="border-b border-[var(--line)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--ink)]">{barangay.name}</h2>
              <p className="mt-0.5 text-sm text-[var(--ink-muted)]">
                {barangay.code ? `${barangay.code} · ` : ""}
                <MemberMix members={members} />
              </p>
            </div>
            <Badge color="slate">
              {members.length} member{members.length === 1 ? "" : "s"}
            </Badge>
          </div>

          {/* Row controls: filter this barangay, and how many rows to show. */}
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div className="relative min-w-56 flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-[34px] text-[var(--ink-muted)]"
              />
              <Input
                label="Find a member"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Member no. or name"
                className="pl-9"
              />
            </div>
            <Select
              label="Rows per page"
              className="w-32"
              value={pageSize}
              onChange={(e) => onPageSize(Number(e.target.value))}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <DataTable>
          <thead>
            <tr>
              <th>Member No.</th>
              <th>Name</th>
              <th>Type</th>
              <th>Date joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="text-[#2F3437]">{m.memberNo}</td>
                <td className="text-[#2F3437]">
                  {m.firstName} {m.lastName}
                </td>
                <td>
                  <MembershipBadge type={m.membershipType} />
                </td>
                <td className="text-[#787774]">{formatDate(m.dateJoined)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4}>
                  {q ? `No members match "${search.trim()}".` : "No members in this barangay."}
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-3">
            {/* The badge above keeps the barangay's true total, so say plainly
                how much of it the filter is showing. */}
            <p className="text-sm text-[var(--ink-muted)]">
              {q
                ? `Showing ${filtered.length} of ${members.length} member${members.length === 1 ? "" : "s"}`
                : `${members.length} member${members.length === 1 ? "" : "s"}`}
            </p>
            {rowCount > 1 && (
              <div className="-mt-4">
                <Pagination page={rowPage} pageCount={rowCount} onPage={setRowPage} />
              </div>
            )}
          </div>
        )}
      </Card>
    </>
  );
}

// Regular / Associate split for the barangay on screen — the mix is what gets
// reported on, and it isn't visible from a row count alone.
function MemberMix({ members }) {
  if (members.length === 0) return <>No active members</>;
  const regular = members.filter((m) => m.membershipType === "REGULAR").length;
  const associate = members.length - regular;
  return (
    <>
      {members.length} member{members.length === 1 ? "" : "s"}
      {regular > 0 && ` · ${regular} Regular`}
      {associate > 0 && ` · ${associate} Associate`}
    </>
  );
}

// Previous / Next with a jump-to-name dropdown. Numbered buttons are no use when
// the pages are named places, so the name list is the direct-access control.
function BarangayNav({ page, pageCount, onPage, barangays }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-surface)] border border-[var(--line)] bg-white px-3 py-2.5">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft size={16} />
        Previous
      </Button>

      <div className="flex flex-1 items-center justify-center gap-3">
        <span className="tabular whitespace-nowrap text-sm text-[var(--ink-muted)]">
          Barangay <span className="font-medium text-[var(--ink-body)]">{page}</span> of {pageCount}
        </span>
        <Select
          className="w-48"
          value={page}
          aria-label="Jump to barangay"
          onChange={(e) => onPage(Number(e.target.value))}
        >
          {barangays.map((b, i) => (
            <option key={b.id} value={i + 1}>
              {b.name} ({b.members.length})
            </option>
          ))}
        </Select>
      </div>

      <Button variant="secondary" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
        Next
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}

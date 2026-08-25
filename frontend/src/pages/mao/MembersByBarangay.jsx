import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../../lib/api";
import {
  Card,
  Spinner,
  PageHeader,
  Button,
  Input,
  Badge,
  MembershipBadge,
  Modal,
  Select,
  DataTable,
  Pagination,
} from "../../components/ui";
import { usePagination } from "../../lib/usePagination";
import { formatDate } from "../../lib/format";
import { FileDown, Search, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZES = [10, 30, 50, 100];

function exportPdf(data, scopeLabel) {
  const totalMembers = data.reduce((s, b) => s + b.members.length, 0);
  const doc = new jsPDF({ unit: "pt" });
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  doc.setFontSize(16);
  doc.text("SMARTCOOP — Members by Barangay", margin, 40);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `${scopeLabel} · ${totalMembers} active member${totalMembers === 1 ? "" : "s"} · Generated ${new Date().toLocaleDateString()}`,
    margin,
    58
  );

  let cursorY = 80;
  data.forEach((b) => {
    if (cursorY > pageHeight - 100) {
      doc.addPage();
      cursorY = 50;
    }
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text(`${b.name} (${b.members.length})`, margin, cursorY);

    autoTable(doc, {
      startY: cursorY + 8,
      head: [["Member No.", "Name", "Type", "Date joined"]],
      body: b.members.length
        ? b.members.map((m) => [
            m.memberNo,
            `${m.firstName} ${m.lastName}`,
            m.membershipType,
            m.dateJoined ? new Date(m.dateJoined).toLocaleDateString() : "—",
          ])
        : [["—", "No members in this barangay.", "—", "—"]],
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [52, 101, 56] },
      margin: { left: margin, right: margin },
    });

    cursorY = doc.lastAutoTable.finalY + 24;
  });

  const slug = scopeLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  doc.save(`smartcoop-members-${slug}.pdf`);
}

export default function MembersByBarangay() {
  const [data, setData] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [exportBarangayId, setExportBarangayId] = useState("CURRENT");
  // Carried between barangays; the search box is not (see goBarangay).
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/mao/members-by-barangay").then((res) => setData(res.data));
  }, []);

  // One barangay per page. The hook clamps the page into range, so a shorter
  // list never strands the view on a page that no longer exists.
  const { page: bPage, setPage: setBPage, pageCount: bCount, pageItems } = usePagination(data, 1);
  const barangay = pageItems[0];

  // Members of the barangay on screen, filtered by the search box. Every
  // whitespace-separated term must hit the member no. or the name, so
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
    setBPage(n);
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

  if (!data) return <Spinner />;

  const totalMembers = data.reduce((s, b) => s + b.members.length, 0);

  function openExport() {
    setExportBarangayId("CURRENT");
    setShowExport(true);
  }

  function confirmExport() {
    // Always the barangay's full membership — an export that quietly dropped
    // rows hidden by the search box would be a reporting hazard.
    if (exportBarangayId === "CURRENT" && barangay) {
      exportPdf([barangay], barangay.name);
    } else if (exportBarangayId === "ALL") {
      exportPdf(data, "All Barangays");
    } else {
      const b = data.find((x) => String(x.id) === exportBarangayId);
      if (b) exportPdf([b], b.name);
    }
    setShowExport(false);
  }

  const nav = <BarangayNav page={bPage} pageCount={bCount} onPage={goBarangay} barangays={data} />;

  return (
    <div>
      <PageHeader
        eyebrow="Municipal Agriculture Office"
        title="Members by Barangay"
        subtitle={`${totalMembers} active member${totalMembers === 1 ? "" : "s"} across ${data.length} barangay${data.length === 1 ? "" : "s"}`}
        actions={
          <Button onClick={openExport}>
            <FileDown size={16} />
            Export PDF
          </Button>
        }
      />

      {!barangay ? (
        <Card>
          <p className="text-[var(--ink-muted)]">No barangays on record.</p>
        </Card>
      ) : (
        <>
          {nav}

          <Card className="mt-4 p-0">
            <div className="border-b border-[var(--line)] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--ink)]">{barangay.name}</h2>
                  <p className="mt-0.5 text-sm text-[var(--ink-muted)]">
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
                      {q
                        ? `No members match "${search.trim()}".`
                        : "No members in this barangay."}
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

          <div className="mt-4">{nav}</div>
        </>
      )}

      <Modal open={showExport} onClose={() => setShowExport(false)} title="Export PDF">
        <div className="space-y-4">
          <Select
            label="Barangay"
            value={exportBarangayId}
            onChange={(e) => setExportBarangayId(e.target.value)}
            hint="The PDF always lists every member of the barangay, regardless of any search filter."
          >
            {barangay && <option value="CURRENT">This barangay ({barangay.name})</option>}
            <option value="ALL">All Barangays</option>
            {data.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowExport(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmExport}>
              <FileDown size={16} />
              Export
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Regular / Associate split for the barangay on screen — the mix is what the MAO
// reports on, and it isn't visible from a row count alone.
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

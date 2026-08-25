import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../../lib/api";
import { Spinner, PageHeader, Button, Modal, Select } from "../../components/ui";
import BarangayBrowser from "../../components/BarangayBrowser";
import { FileDown } from "lucide-react";

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
  // Which barangay is on screen, so "export this one" knows what "this" is.
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get("/mao/members-by-barangay").then((res) => setData(res.data));
  }, []);

  if (!data) return <Spinner />;

  const totalMembers = data.reduce((s, b) => s + b.members.length, 0);
  const barangay = data[Math.min(page, data.length) - 1];

  function confirmExport() {
    // Always a barangay's full membership — an export that quietly dropped rows
    // hidden by a search filter would be a reporting hazard.
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

  return (
    <div>
      <PageHeader
        eyebrow="Municipal Agriculture Office"
        title="Members by Barangay"
        subtitle={`${totalMembers} active member${totalMembers === 1 ? "" : "s"} across ${data.length} barangay${data.length === 1 ? "" : "s"}`}
        actions={
          <Button onClick={() => { setExportBarangayId("CURRENT"); setShowExport(true); }}>
            <FileDown size={16} />
            Export PDF
          </Button>
        }
      />

      <BarangayBrowser data={data} page={page} onPage={setPage} />

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

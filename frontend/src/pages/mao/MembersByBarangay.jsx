import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../../lib/api";
import { Card, Spinner, PageHeader, Button, Badge, MembershipBadge } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { FileDown } from "lucide-react";

function exportPdf(data, totalMembers) {
  const doc = new jsPDF({ unit: "pt" });
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  doc.setFontSize(16);
  doc.text("SMARTCOOP — Members by Barangay", margin, 40);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `${totalMembers} active member${totalMembers === 1 ? "" : "s"} across ${data.length} barangay${
      data.length === 1 ? "" : "s"
    } · Generated ${new Date().toLocaleDateString()}`,
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

  doc.save("smartcoop-members-by-barangay.pdf");
}

export default function MembersByBarangay() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/mao/members-by-barangay").then((res) => setData(res.data));
  }, []);

  if (!data) return <Spinner />;

  const totalMembers = data.reduce((s, b) => s + b.members.length, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Municipal Agriculture Office"
        title="Members by Barangay"
        subtitle={`${totalMembers} active member${totalMembers === 1 ? "" : "s"} across ${data.length} barangay${data.length === 1 ? "" : "s"}`}
        actions={
          <Button onClick={() => exportPdf(data, totalMembers)}>
            <FileDown size={16} />
            Export PDF
          </Button>
        }
      />

      <div className="space-y-4">
        {data.map((b) => (
          <Card key={b.id}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-[#2F3437]">{b.name}</h3>
              <Badge color="slate">
                {b.members.length} member{b.members.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-[#F7F6F3] text-left text-[#787774]">
                <tr>
                  <th className="px-3 py-2 font-medium">Member No.</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Date joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F1ED]">
                {b.members.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 text-[#2F3437]">{m.memberNo}</td>
                    <td className="px-3 py-2 text-[#2F3437]">
                      {m.firstName} {m.lastName}
                    </td>
                    <td className="px-3 py-2">
                      <MembershipBadge type={m.membershipType} />
                    </td>
                    <td className="px-3 py-2 text-[#787774]">{formatDate(m.dateJoined)}</td>
                  </tr>
                ))}
                {b.members.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-[#B0AFAB]">
                      No members in this barangay.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        ))}
      </div>
    </div>
  );
}

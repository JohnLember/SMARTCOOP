import { useEffect, useState } from "react";
import api from "../lib/api";
import { Button, Card, Spinner, PageHeader, Badge, Modal, Select, Pagination, DataTable } from "../components/ui";
import ReceiptDocument from "../components/ReceiptDocument";
import { buildReceiptRows, countsByType, RECEIPT_TYPES } from "../lib/receiptRows";
import { usePagination } from "../lib/usePagination";
import { formatDate } from "../lib/format";
import { Eye } from "lucide-react";

const peso = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TYPE_COLOR = { Delivery: "green", Membership: "amber", "Loan payment": "blue" };

export default function MyReceipts() {
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState(null);
  const [type, setType] = useState("");

  useEffect(() => {
    // Both endpoints scope themselves to the signed-in member. Deliveries and
    // membership fees come from receipts; loan payments are their own record.
    Promise.all([api.get("/production/receipts"), api.get("/finance/loan-payments")])
      .then(([r, p]) => setRows(buildReceiptRows(r.data, p.data)))
      .catch(() => setRows([]));
  }, []);

  const all = rows ?? [];
  const filtered = type ? all.filter((r) => r.type === type) : all;
  const { page, setPage, pageCount, pageItems } = usePagination(filtered, 15);

  if (!rows) return <Spinner />;

  const counts = countsByType(all);
  // Voided payments never count toward what the member has actually paid.
  const totals = filtered.reduce(
    (acc, r) => (r.voidedAt ? acc : { received: acc.received + (r.received ?? 0), paid: acc.paid + (r.paid ?? 0) }),
    { received: 0, paid: 0 }
  );

  return (
    <div>
      <PageHeader
        title="My Receipts"
        subtitle="Every receipt the cooperative has issued you — deliveries, membership and loan payments"
        actions={
          <Select
            className="w-52"
            aria-label="Filter by receipt type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All types ({all.length})</option>
            {RECEIPT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t} ({counts[t]})
              </option>
            ))}
          </Select>
        }
      />

      <Card className="p-0">
        {/* Received and Paid cost a column each, so the table scrolls inside its
            own card on a phone rather than pushing the page sideways. */}
        <div className="overflow-x-auto">
          <DataTable>
            <thead>
              <tr>
                <th>Receipt No.</th>
                <th>Date</th>
                <th>Type</th>
                <th className="num">Received</th>
                <th className="num">Paid</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r) => (
                <tr key={r.key} className={r.voidedAt ? "text-[var(--ink-faint)]" : undefined}>
                  <td className={`font-medium ${r.voidedAt ? "line-through" : "text-[var(--ink-body)]"}`}>
                    {r.no}
                  </td>
                  <td className="text-[var(--ink-muted)]">{formatDate(r.date)}</td>
                  <td>
                    <Badge color={r.voidedAt ? "slate" : TYPE_COLOR[r.type]}>{r.type}</Badge>
                  </td>
                  <td className="num font-medium text-[var(--brand)]">
                    {r.received != null ? peso(r.received) : "—"}
                  </td>
                  <td className="num">
                    {r.voidedAt ? (
                      <span className="font-mono-meta text-[11px] uppercase tracking-[0.12em]">Voided</span>
                    ) : r.paid != null ? (
                      <span className="font-medium text-[var(--ink-body)]">{peso(r.paid)}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-right">
                    <Button variant="ghost" onClick={() => setSelected(r.doc)}>
                      <Eye size={16} />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    {all.length === 0
                      ? "No receipts yet. They are issued when the cooperative records a delivery, your membership fee, or a loan payment."
                      : `No ${type.toLowerCase()} receipts.`}
                  </td>
                </tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t border-[var(--line-strong)] bg-[var(--sunken)]">
                  <td colSpan={3} className="font-medium text-[var(--ink-body)]">
                    Total {type ? `(${type.toLowerCase()})` : ""}
                  </td>
                  <td className="num font-semibold text-[var(--brand)]">{peso(totals.received)}</td>
                  <td className="num font-semibold text-[var(--ink)]">{peso(totals.paid)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </DataTable>
        </div>
      </Card>

      {filtered.length > 0 && <Pagination page={page} pageCount={pageCount} onPage={setPage} />}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Receipt">
        {selected && <ReceiptDocument receipt={selected} />}
      </Modal>
    </div>
  );
}

import { useEffect, useState } from "react";
import api from "../lib/api";
import { Card, Spinner, PageHeader, Badge, Select, Pagination } from "../components/ui";
import { usePagination } from "../lib/usePagination";
import { formatDate } from "../lib/format";

const peso = (n) =>
  `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_COLOR = { PENDING: "amber", APPROVED: "green", REJECTED: "red" };
const STATUSES = ["APPROVED", "REJECTED", "PENDING"];
const title = (s) => s.charAt(0) + s.slice(1).toLowerCase();

export default function MyLoans() {
  const [apps, setApps] = useState(null);
  const [loans, setLoans] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    // Both endpoints scope themselves to the signed-in member. Applications carry
    // the outcome; the loan itself carries the balance, so they're joined by
    // loanId rather than asking the API for a combined shape.
    Promise.all([api.get("/loan-applications"), api.get("/finance/loans")]).then(
      ([appRes, loanRes]) => {
        setApps(appRes.data);
        setLoans(loanRes.data);
      }
    );
  }, []);

  const filtered = (apps ?? []).filter((a) => !status || a.status === status);
  const { page, setPage, pageCount, pageItems } = usePagination(filtered, 10);

  if (!apps) return <Spinner />;

  const loanFor = (app) => loans.find((l) => l.id === app.loanId);
  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: apps.filter((a) => a.status === s).length }),
    {}
  );

  return (
    <div>
      <PageHeader
        title="My Loans"
        subtitle="Every loan you have applied for, and how it was decided"
        actions={
          <Select
            className="w-44"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses ({apps.length})</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {title(s)} ({counts[s]})
              </option>
            ))}
          </Select>
        }
      />

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-[#F7F6F3] text-left text-[#787774]">
            <tr>
              <th className="px-4 py-3 font-medium">Application No.</th>
              <th className="px-4 py-3 font-medium">Date applied</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Term</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F1ED]">
            {pageItems.map((a) => {
              const loan = loanFor(a);
              return (
                <tr key={a.id} className="hover:bg-[#F7F6F3]">
                  <td className="px-4 py-3 font-medium text-[#2F3437]">{a.applicationNo}</td>
                  <td className="px-4 py-3 text-[#787774]">{formatDate(a.createdAt)}</td>
                  <td className="px-4 py-3 text-[#2F3437]">{peso(a.principalAmount)}</td>
                  <td className="px-4 py-3 text-[#787774]">{a.termMonths} mo.</td>
                  <td className="px-4 py-3">
                    <Badge color={STATUS_COLOR[a.status] ?? "slate"}>{title(a.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#787774]">
                    {a.status === "APPROVED" ? (
                      loan ? (
                        <span>
                          <span className="font-medium text-[#346538]">
                            {peso(loan.remainingBalance)}
                          </span>{" "}
                          remaining · {title(loan.status)}
                          <span className="block text-xs text-[#B0AFAB]">
                            Issued {formatDate(loan.dateIssued)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[#B0AFAB]">Approved — loan being prepared</span>
                      )
                    ) : a.status === "REJECTED" ? (
                      <span>
                        {a.reviewNote || "No reason given"}
                        {a.reviewedAt && (
                          <span className="block text-xs text-[#B0AFAB]">
                            Reviewed {formatDate(a.reviewedAt)}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[#B0AFAB]">Awaiting review</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#B0AFAB]">
                  {apps.length === 0
                    ? "You have not applied for a loan yet. Apply from My Profile."
                    : `No ${title(status).toLowerCase()} loan applications.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {filtered.length > 0 && <Pagination page={page} pageCount={pageCount} onPage={setPage} />}
    </div>
  );
}

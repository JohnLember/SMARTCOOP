import { useEffect, useState } from "react";
import { useParams } from "react-router";
import api from "../../lib/api";
import { Card, Spinner, PageHeader, Badge, StatCard, BackButton, DataTable} from "../../components/ui";
import ShowComputation from "../../components/ShowComputation";
import { formatDate } from "../../lib/format";
import { Wallet, Percent, CalendarClock } from "lucide-react";

const peso = (n) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const SCHED_COLOR = { PAID: "green", PARTIAL: "amber", PENDING: "slate" };

export default function LoanDetail() {
  const { id } = useParams();
  const [loan, setLoan] = useState(null);

  useEffect(() => {
    api.get(`/finance/loans/${id}`).then((res) => setLoan(res.data));
  }, [id]);

  if (!loan) return <Spinner />;

  const totalInterest = loan.schedule.reduce((s, r) => s + Number(r.interestDue), 0);

  return (
    <div>
      <BackButton to="/loans" label="Back to loans" />
      <PageHeader
        title={`Loan — ${loan.member.firstName} ${loan.member.lastName}`}
        subtitle={`${loan.member.memberNo} · issued ${formatDate(loan.dateIssued)}`}
        actions={
          <div className="flex items-center gap-2">
            <ShowComputation url={`/finance/loans/${id}/explain`} label="Show formula" variant="secondary" />
            <Badge color={loan.status === "ACTIVE" ? "green" : "slate"}>{loan.status}</Badge>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Principal" value={peso(loan.principalAmount)} icon={Wallet} />
        <StatCard label="Remaining balance" value={peso(loan.remainingBalance)} icon={Wallet} accent="amber" />
        <StatCard label="Rate / term" value={`${Number(loan.interestRate)}% · ${loan.termMonths}mo`} icon={Percent} accent="blue" />
        <StatCard label="Total interest" value={peso(totalInterest)} icon={CalendarClock} accent="red" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="col-span-2 p-0">
          <h3 className="px-4 pt-4 font-semibold text-[#2F3437]">Amortization schedule (diminishing interest)</h3>
          <DataTable className="mt-3">
            <thead>
              <tr>
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Due date</th>
                <th className="px-4 py-2 font-medium">Principal</th>
                <th className="px-4 py-2 font-medium">Interest</th>
                <th className="px-4 py-2 font-medium">Total due</th>
                <th className="px-4 py-2 font-medium">Paid</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loan.schedule.map((r) => (
                <tr key={r.id} className="hover:bg-[#F7F6F3]">
                  <td className="px-4 py-2 text-[#787774]">{r.periodNo}</td>
                  <td className="px-4 py-2 text-[#787774]">{formatDate(r.dueDate)}</td>
                  <td className="px-4 py-2 text-[#787774]">{peso(r.principalDue)}</td>
                  <td className="px-4 py-2 text-[#787774]">{peso(r.interestDue)}</td>
                  <td className="px-4 py-2 font-medium text-[#2F3437]">{peso(r.totalDue)}</td>
                  <td className="px-4 py-2 text-[#787774]">{peso(r.amountPaid)}</td>
                  <td className="px-4 py-2">
                    <Badge color={SCHED_COLOR[r.status]}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold text-[#2F3437]">Payments (from deliveries)</h3>
          <div className="space-y-2">
            {loan.payments.length === 0 && (
              <p className="text-sm text-[#5F5E5A]">No payments deducted yet.</p>
            )}
            {loan.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-[#F2F1ED] px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-[#346538]">{peso(p.amountDeducted)}</p>
                  <p className="text-xs text-[#5F5E5A]">
                    {formatDate(p.paymentDate)}
                    {p.delivery ? ` · ${Number(p.delivery.weightKg)}kg delivery` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

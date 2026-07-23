import prisma from "../../config/db.js";

// One-shot aggregate for the staff/admin dashboard: membership mix, the queues
// waiting on staff (pending applications / loan applications), loan exposure,
// open batches, plus the most recent items still needing review.
export async function staffStats() {
  const [
    active,
    associates,
    regulars,
    pendingApplications,
    pendingLoanApplications,
    activeLoans,
    outstanding,
    openBatches,
    recentApplications,
    recentLoanApplications,
    monthly,
  ] = await Promise.all([
    prisma.member.count({ where: { status: "ACTIVE" } }),
    prisma.member.count({ where: { status: "ACTIVE", membershipType: "ASSOCIATE" } }),
    prisma.member.count({ where: { status: "ACTIVE", membershipType: "REGULAR" } }),
    prisma.membershipApplication.count({ where: { status: "PENDING" } }),
    prisma.loanApplication.count({ where: { status: "PENDING" } }),
    prisma.loan.count({ where: { status: "ACTIVE" } }),
    prisma.loan.aggregate({ where: { status: "ACTIVE" }, _sum: { remainingBalance: true } }),
    prisma.loadingBatch.count({ where: { status: "OPEN" } }),
    prisma.membershipApplication.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        applicationNo: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        barangay: { select: { name: true } },
      },
    }),
    prisma.loanApplication.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        applicationNo: true,
        principalAmount: true,
        termMonths: true,
        createdAt: true,
        member: { select: { memberNo: true, firstName: true, lastName: true } },
      },
    }),
    // Rubber delivered per month over the last 12 months, for the trend chart.
    prisma.$queryRaw`
      SELECT DATE_FORMAT(delivery_date, '%Y-%m') AS month,
             COALESCE(SUM(weight_kg), 0) AS totalKg
      FROM rubber_deliveries
      WHERE delivery_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `,
  ]);

  return {
    members: { active, associates, regulars },
    pending: { applications: pendingApplications, loanApplications: pendingLoanApplications },
    loans: { active: activeLoans, outstanding: Number(outstanding._sum.remainingBalance ?? 0) },
    batches: { open: openBatches },
    recentApplications,
    recentLoanApplications,
    monthlyProduction: monthly.map((r) => ({ month: r.month, totalKg: Number(r.totalKg ?? 0) })),
  };
}

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(pw) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log("Seeding SMARTCOOP database...");

  // --- App settings: progression algorithm config ---
  await prisma.appSetting.upsert({
    where: { key: "progression" },
    update: {},
    create: {
      key: "progression",
      value: {
        rankUp: { minShareCapital: 5000, minDeliveryVolumeKg: 1000, requireBoth: true },
        weights: { shareCapital: 0.45, deliveryVolume: 0.4, tenure: 0.15 },
        caps: { shareCapital: 20000, deliveryVolumeKg: 5000, tenureMonths: 60 },
        regularBonus: 10,
      },
    },
  });

  // --- Barangays (San Luis, Aurora sample barangays) ---
  const barangayNames = ["Poblacion", "Dibalo", "Dibut", "Dikapinisan", "Dimanayat", "Nonong Senior", "Real", "San Isidro", "Bacong"];
  const barangays = {};
  for (const name of barangayNames) {
    const b = await prisma.barangay.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    barangays[name] = b.id;
  }

  // --- Admin + MAO + Staff users ---
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", passwordHash: await hash("admin123"), role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { username: "staff" },
    update: {},
    create: { username: "staff", passwordHash: await hash("staff123"), role: "STAFF" },
  });
  await prisma.user.upsert({
    where: { username: "mao" },
    update: {},
    create: { username: "mao", passwordHash: await hash("mao123"), role: "MAO" },
  });

  // --- Sample members ---
  const sampleMembers = [
    { memberNo: "M-0001", firstName: "Juan", lastName: "Dela Cruz", sex: "Male", barangay: "Poblacion", membershipType: "REGULAR", shareCapital: 15000, dateJoined: "2019-03-01" },
    { memberNo: "M-0002", firstName: "Maria", lastName: "Santos", sex: "Female", barangay: "Dibut", membershipType: "ASSOCIATE", shareCapital: 6000, dateJoined: "2022-07-15" },
    { memberNo: "M-0003", firstName: "Pedro", lastName: "Reyes", sex: "Male", barangay: "Real", membershipType: "ASSOCIATE", shareCapital: 2500, dateJoined: "2023-11-20" },
    { memberNo: "M-0004", firstName: "Ana", lastName: "Lim", sex: "Female", barangay: "San Isidro", membershipType: "ASSOCIATE", shareCapital: 8000, dateJoined: "2021-01-10" },
    { memberNo: "M-0005", firstName: "Jose", lastName: "Garcia", sex: "Male", barangay: "Bacong", membershipType: "REGULAR", shareCapital: 18500, dateJoined: "2018-06-05" },
  ];

  for (const m of sampleMembers) {
    const { barangay, dateJoined, ...rest } = m;
    await prisma.member.upsert({
      where: { memberNo: m.memberNo },
      update: {},
      create: {
        ...rest,
        barangayId: barangays[barangay],
        dateJoined: new Date(dateJoined),
      },
    });
  }

  // The cooperative's farmer roster (backend/farmers.js.txt) is deliberately NOT
  // seeded as members: those farmers enter through MembershipApplication and
  // become members only when staff approves them. Importing them here created a
  // member for every pending applicant and a duplicate on approval.

  // --- Link a member login to the first member ---
  // Skipped when M-0001 already has a login — a member can only have one, so
  // re-seeding a database the app has been used on would otherwise blow up.
  const firstMember = await prisma.member.findUnique({ where: { memberNo: "M-0001" } });
  if (firstMember && !(await prisma.user.findUnique({ where: { memberId: firstMember.id } }))) {
    await prisma.user.upsert({
      where: { username: "juan" },
      update: {},
      create: {
        username: "juan",
        passwordHash: await hash("member123"),
        role: "MEMBER",
        memberId: firstMember.id,
      },
    });
  }

  // --- A sample support program + affected-area tag for MAO dashboard ---
  await prisma.supportProgram.create({
    data: {
      name: "2026 Fertilizer Distribution",
      type: "Fertilizer Distribution",
      description: "Subsidized fertilizer for rubber farmers.",
      targetBarangayId: barangays["Poblacion"],
      startDate: new Date("2026-01-15"),
      status: "ONGOING",
      budget: 250000,
    },
  }).catch(() => {});

  console.log("\nSeed complete. Login accounts:");
  console.log("  admin / admin123   (ADMIN)");
  console.log("  staff / staff123   (STAFF)");
  console.log("  mao   / mao123     (MAO)");
  console.log("  juan  / member123  (MEMBER → M-0001)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

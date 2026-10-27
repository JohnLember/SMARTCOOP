import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { farmers } from "./farmers.data.js";

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

  // --- Barangays (the cooperative's list, SANLUIS_BRGYLIST.xlsx; "Outside SL" covers members living outside San Luis) ---
  const barangayNames = [
    "Anislagan", "Balit", "Baylo", "Binicalan", "Cecilia", "Coalicion", "Culi", "Dimasalang",
    "Don Alejandro", "Don Pedro", "Doña Flavia", "Duangan", "KM7", "Doña Maxima", "Mahagsay",
    "Mahapag", "Mahayahay", "Muritula", "Nuevo Trabajo", "Poblacion", "Policarpo", "San Isidro",
    "San Pedro", "Santa Ines", "Santa Rita", "Santiago", "Tuburan", "Wegguam", "Outside SL",
  ];
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
    { memberNo: "M-0002", firstName: "Maria", lastName: "Santos", sex: "Female", barangay: "Santa Rita",membershipType: "ASSOCIATE", shareCapital: 6000, dateJoined: "2022-07-15" },
    { memberNo: "M-0003", firstName: "Pedro", lastName: "Reyes", sex: "Male", barangay: "Mahayahay",membershipType: "ASSOCIATE", shareCapital: 2500, dateJoined: "2023-11-20" },
    { memberNo: "M-0004", firstName: "Ana", lastName: "Lim", sex: "Female", barangay: "San Isidro", membershipType: "ASSOCIATE", shareCapital: 8000, dateJoined: "2021-01-10" },
    { memberNo: "M-0005", firstName: "Jose", lastName: "Garcia", sex: "Male", barangay: "Coalicion",membershipType: "REGULAR", shareCapital: 18500, dateJoined: "2018-06-05" },
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

  // The cooperative's farmer roster (backend/prisma/farmers.data.js) is
  // deliberately NOT seeded as members: those farmers enter through
  // MembershipApplication and become members only when staff approves them.
  // Importing them as members here created a duplicate on approval.
  const existingApplicationCount = await prisma.membershipApplication.count();
  if (existingApplicationCount === 0) {
    // Made-up contact details, from a fixed random seed so every reset gives the same values.
    const rng = (seed) => () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const rand = rng(20260);
    const pick = (n) => Math.floor(rand() * n);
    // Submitted: random moments from Aug 27 to Oct 17, 2026 (Philippine time), sorted so
    // APP numbers follow submission order. Own stream, so the other values don't shift.
    const randSubmitted = rng(827);
    const from = Date.parse("2026-08-27T00:00:00+08:00");
    const to = Date.parse("2026-10-18T00:00:00+08:00");
    const submitted = farmers.map(() => from + Math.floor(randSubmitted() * (to - from))).sort((a, b) => a - b);
    // Ages 26–49 today: born after (today − 50 years) and on or before (today − 26 years).
    const today = new Date();
    const utc = (yearsBack, dayShift = 0) =>
      Date.UTC(today.getFullYear() - yearsBack, today.getMonth(), today.getDate() + dayShift);
    const oldest = utc(50, 1);
    const youngest = utc(26);
    const DAY = 86400000;
    const emailCount = {};

    let nextNo = 1;
    for (const [firstName, lastName, middleName] of farmers) {
      // "Dela Cruz" → delacruz, "Ruth-Personal" → ruthpersonal; a repeated name gets 2, 3, …
      const base = `${firstName}${lastName}`.normalize("NFD").toLowerCase().replace(/[^a-z]/g, "");
      emailCount[base] = (emailCount[base] ?? 0) + 1;
      await prisma.membershipApplication.create({
        data: {
          applicationNo: `APP-${String(nextNo).padStart(4, "0")}`,
          firstName,
          lastName,
          middleName: middleName || null,
          membershipType: "ASSOCIATE",
          status: "PENDING",
          barangayId: barangays[barangayNames[pick(barangayNames.length)]],
          contactNo: "09" + String(pick(1e9)).padStart(9, "0"),
          email: `${base}${emailCount[base] > 1 ? emailCount[base] : ""}@gmail.com`,
          birthdate: new Date(oldest + pick((youngest - oldest) / DAY + 1) * DAY),
          createdAt: new Date(submitted[nextNo - 1]),
        },
      });
      nextNo += 1;
    }
    console.log(`  Seeded ${farmers.length} pending membership applications from farmer roster.`);
  }

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

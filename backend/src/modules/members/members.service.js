import prisma from "../../config/db.js";
import { hashPassword } from "../../utils/password.js";
import { badRequest, conflict, notFound } from "../../utils/httpError.js";
import { logActivity } from "../../utils/activityLog.js";

const memberInclude = { barangay: true, user: { select: { id: true, username: true, status: true } } };

// A member is auto-promoted from Associate to Regular once accumulated CBU
// (Capital Build-Up) or share-capital savings reach this amount.
export const REGULAR_PROMOTION_THRESHOLD = 10000;

// Promotes ASSOCIATE -> REGULAR when CBU total or savings reach the threshold.
// Never demotes. Safe to call after a delivery (CBU changes) or capital change.
export async function promoteIfEligible(memberId) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, memberNo: true, membershipType: true, shareCapital: true },
  });
  if (!member || member.membershipType === "REGULAR") return member;

  const agg = await prisma.receipt.aggregate({
    where: { memberId },
    _sum: { cbu: true },
  });
  const cbuTotal = Number(agg._sum.cbu ?? 0);
  const savings = Number(member.shareCapital ?? 0);

  if (cbuTotal >= REGULAR_PROMOTION_THRESHOLD || savings >= REGULAR_PROMOTION_THRESHOLD) {
    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { membershipType: "REGULAR" },
    });
    await logActivity(
      null,
      `Auto-promoted ${member.memberNo} to REGULAR (CBU ₱${cbuTotal.toFixed(2)}, savings ₱${savings.toFixed(2)})`
    );
    return updated;
  }
  return member;
}

export async function list({ search, membershipType, status, barangayId, page = 1, pageSize = 20 }) {
  const where = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { memberNo: { contains: search } },
    ];
  }
  if (membershipType) where.membershipType = membershipType;
  if (status) where.status = status;
  if (barangayId) where.barangayId = Number(barangayId);

  const skip = (Number(page) - 1) * Number(pageSize);

  const [items, total] = await Promise.all([
    prisma.member.findMany({
      where,
      include: memberInclude,
      orderBy: [{ lastName: "asc" }],
      skip,
      take: Number(pageSize),
    }),
    prisma.member.count({ where }),
  ]);

  return { items, total, page: Number(page), pageSize: Number(pageSize) };
}

export async function getById(id) {
  const member = await prisma.member.findUnique({
    where: { id },
    include: memberInclude,
  });
  if (!member) throw notFound("Member not found");
  return member;
}

export async function create(data, actorId) {
  const exists = await prisma.member.findUnique({
    where: { memberNo: data.memberNo },
  });
  if (exists) throw conflict("Member number already exists");

  const member = await prisma.member.create({
    data: {
      ...data,
      birthdate: data.birthdate ? new Date(data.birthdate) : null,
      dateJoined: data.dateJoined ? new Date(data.dateJoined) : new Date(),
    },
    include: memberInclude,
  });

  await logActivity(actorId, `Created member ${member.memberNo} (${member.lastName})`);
  return member;
}

export async function update(id, data, actorId) {
  await getById(id);
  const member = await prisma.member.update({
    where: { id },
    data: {
      ...data,
      birthdate: data.birthdate ? new Date(data.birthdate) : undefined,
      dateJoined: data.dateJoined ? new Date(data.dateJoined) : undefined,
    },
    include: memberInclude,
  });
  await logActivity(actorId, `Updated member ${member.memberNo}`);
  // Share capital may have changed — re-check auto-promotion.
  await promoteIfEligible(id).catch(() => {});
  return getById(id);
}

export async function setStatus(id, status, actorId) {
  await getById(id);
  const member = await prisma.member.update({
    where: { id },
    data: { status },
    include: memberInclude,
  });
  await logActivity(actorId, `Set member ${member.memberNo} status to ${status}`);
  return member;
}

// Creates a linked MEMBER login for a member.
export async function createAccount(id, { username, password }, actorId) {
  const member = await getById(id);
  if (member.user) throw conflict("This member already has a user account");

  const taken = await prisma.user.findUnique({ where: { username } });
  if (taken) throw conflict("Username already taken");

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: await hashPassword(password),
      role: "MEMBER",
      memberId: id,
    },
    select: { id: true, username: true, role: true, memberId: true },
  });

  await logActivity(actorId, `Created member login "${username}" for ${member.memberNo}`);
  return user;
}

import prisma from "../../config/db.js";
import { hashPassword } from "../../utils/password.js";
import { badRequest, conflict, notFound } from "../../utils/httpError.js";
import { logActivity } from "../../utils/activityLog.js";

const memberInclude = { barangay: true, user: { select: { id: true, username: true, status: true } } };

// Projection for `all=1` roster fetches: everything a member picker needs, minus
// the base64 profilePhoto — that column is a MediumText image, so pulling it for
// the whole roster would be megabytes per dropdown.
const pickerSelect = {
  id: true,
  memberNo: true,
  firstName: true,
  middleName: true,
  lastName: true,
  membershipType: true,
  status: true,
  barangay: true,
  user: { select: { id: true, username: true, status: true } },
};

// A member is auto-promoted from Associate to Regular once accumulated CBU
// (Capital Build-Up) reaches this amount.
export const REGULAR_PROMOTION_THRESHOLD = 10000;

// Promotes ASSOCIATE -> REGULAR when CBU total reaches the threshold.
// Never demotes. Safe to call after a delivery (CBU changes).
export async function promoteIfEligible(memberId) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, memberNo: true, membershipType: true },
  });
  if (!member || member.membershipType === "REGULAR") return member;

  const agg = await prisma.receipt.aggregate({
    where: { memberId },
    _sum: { cbu: true },
  });
  const cbuTotal = Number(agg._sum.cbu ?? 0);

  if (cbuTotal >= REGULAR_PROMOTION_THRESHOLD) {
    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { membershipType: "REGULAR" },
    });
    await logActivity(null, `Auto-promoted ${member.memberNo} to REGULAR (CBU ₱${cbuTotal.toFixed(2)})`);
    return updated;
  }
  return member;
}

export async function list({ search, membershipType, status, barangayId, page = 1, pageSize = 20, all }) {
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

  // Member pickers (record a delivery, issue a loan, link a login) search the
  // whole roster client-side, so they must receive it whole — a fixed page
  // silently hid every member sorting past it.
  const fetchAll = all === "1" || all === true;

  const [items, total] = await Promise.all([
    prisma.member.findMany({
      where,
      ...(fetchAll
        ? { select: pickerSelect }
        : { include: memberInclude, skip, take: Number(pageSize) }),
      orderBy: [{ lastName: "asc" }],
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
  // Re-check auto-promotion in case the member already crossed the CBU threshold.
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

import prisma from "../../config/db.js";
import { hashPassword } from "../../utils/password.js";
import { badRequest, conflict, notFound } from "../../utils/httpError.js";
import { logActivity } from "../../utils/activityLog.js";

// Fields returned to the client — never the password hash.
const userSelect = {
  id: true,
  username: true,
  role: true,
  status: true,
  memberId: true,
  createdAt: true,
  updatedAt: true,
  member: {
    select: { id: true, memberNo: true, firstName: true, lastName: true },
  },
};

export async function list({ search, role, status }) {
  const where = {};
  if (search) where.username = { contains: search };
  if (role) where.role = role;
  if (status) where.status = status;

  return prisma.user.findMany({
    where,
    select: userSelect,
    orderBy: [{ username: "asc" }],
  });
}

export async function getById(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!user) throw notFound("User not found");
  return user;
}

export async function create({ username, password, role, memberId }, actorId) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw conflict("Username already taken");

  if (role === "MEMBER" && !memberId) {
    throw badRequest("A MEMBER account must be linked to a member");
  }

  if (memberId) {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw badRequest("Linked member does not exist");
    const linked = await prisma.user.findUnique({ where: { memberId } });
    if (linked) throw conflict("This member already has a user account");
  }

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: await hashPassword(password),
      role,
      memberId: role === "MEMBER" ? memberId : null,
    },
    select: userSelect,
  });

  await logActivity(actorId, `Created ${role} account "${username}"`);
  return user;
}

// Updates role and/or status. A MEMBER-linked account cannot change role away
// from MEMBER (its identity is tied to a member record), and vice versa.
export async function update(id, { role, status }, actorId) {
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) throw notFound("User not found");

  if (role && role !== current.role) {
    if (current.memberId && role !== "MEMBER") {
      throw badRequest("This account is linked to a member and must remain a MEMBER");
    }
    if (!current.memberId && role === "MEMBER") {
      throw badRequest("Create a MEMBER login from the member's record to link it");
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      role: role ?? undefined,
      status: status ?? undefined,
    },
    select: userSelect,
  });

  await logActivity(actorId, `Updated account "${user.username}"`);
  return user;
}

export async function resetPassword(id, password, actorId) {
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) throw notFound("User not found");

  const user = await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password) },
    select: userSelect,
  });

  await logActivity(actorId, `Reset password for "${user.username}"`);
  return user;
}

export async function remove(id, actorId) {
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) throw notFound("User not found");
  if (id === actorId) throw badRequest("You cannot delete your own account");

  await prisma.user.delete({ where: { id } });
  await logActivity(actorId, `Deleted account "${current.username}"`);
  return { deleted: true };
}

import prisma from "../../config/db.js";
import { comparePassword, hashPassword } from "../../utils/password.js";
import { signToken } from "../../utils/jwt.js";
import { badRequest, conflict, unauthorized } from "../../utils/httpError.js";
import { logActivity } from "../../utils/activityLog.js";

// Returns a safe user object (no password hash).
function toSafeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

export async function login(username, password) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { member: true },
  });

  if (!user || user.status !== "ACTIVE") {
    throw unauthorized("Invalid credentials");
  }

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) throw unauthorized("Invalid credentials");

  const token = signToken({
    sub: user.id,
    role: user.role,
    memberId: user.memberId,
    username: user.username,
  });

  await logActivity(user.id, `Logged in`);

  return { token, user: toSafeUser(user) };
}

export async function register({ username, password, role, memberId }, actorId) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw conflict("Username already taken");

  if (role === "MEMBER" && !memberId) {
    throw badRequest("A MEMBER account must be linked to a member (memberId)");
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
  });

  await logActivity(actorId, `Created ${role} account "${username}"`);

  return toSafeUser(user);
}

export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { member: true },
  });
  if (!user) throw unauthorized("User no longer exists");
  return toSafeUser(user);
}

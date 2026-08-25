import prisma from "../../config/db.js";
import { notFound } from "../../utils/httpError.js";

// What this user is allowed to see — and therefore act on:
//  - addressed to their role, OR
//  - addressed directly to their member record (for MEMBER users).
function audienceWhere(user) {
  const or = [{ recipientRole: user.role }];
  if (user.memberId) or.push({ recipientMemberId: user.memberId });
  return { OR: or };
}

export function listForUser(user) {
  return prisma.notification.findMany({
    where: audienceWhere(user),
    orderBy: { dateSent: "desc" },
    take: 100,
    include: { sender: { select: { username: true, role: true } } },
  });
}

// Creates an announcement / notification.
export function create({ title, message, recipientRole, recipientMemberId }, senderUserId) {
  return prisma.notification.create({
    data: {
      title,
      message,
      recipientRole: recipientRole ?? null,
      recipientMemberId: recipientMemberId ?? null,
      senderUserId,
    },
  });
}

// Deletes one or many. The audience filter is part of the where clause, so a
// user can only ever delete rows they were allowed to see — ids they don't own
// simply don't match, and `deleted` reports how many actually went.
// Note: a role-addressed notification is one shared row, so deleting it removes
// it for everyone with that role — same as marking it read already does.
export async function removeMany(ids, user) {
  const { count } = await prisma.notification.deleteMany({
    where: { id: { in: ids }, ...audienceWhere(user) },
  });
  return { deleted: count };
}

export async function markRead(id, user) {
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif) throw notFound("Notification not found");
  // Only the intended audience can mark it read.
  const allowed =
    notif.recipientRole === user.role ||
    (user.memberId && notif.recipientMemberId === user.memberId);
  if (!allowed) throw notFound("Notification not found");

  return prisma.notification.update({
    where: { id },
    data: { status: "READ" },
  });
}

import prisma from "../../config/db.js";
import { notFound } from "../../utils/httpError.js";

// Returns notifications visible to the current user:
//  - addressed to their role, OR
//  - addressed directly to their member record (for MEMBER users).
export function listForUser(user) {
  const or = [{ recipientRole: user.role }];
  if (user.memberId) or.push({ recipientMemberId: user.memberId });

  return prisma.notification.findMany({
    where: { OR: or },
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

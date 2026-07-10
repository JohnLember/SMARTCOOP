import prisma from "../config/db.js";

// Fire-and-forget activity logging. Never blocks or fails the main request.
export async function logActivity(userId, action) {
  try {
    await prisma.activityLog.create({ data: { userId: userId ?? null, action } });
  } catch (err) {
    console.error("Failed to write activity log:", err.message);
  }
}

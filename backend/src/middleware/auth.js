import prisma from "../config/db.js";
import { verifyToken } from "../utils/jwt.js";
import { unauthorized } from "../utils/httpError.js";

// Verifies the Bearer token and attaches { id, role, memberId } to req.user.
//
// The role and memberId come from the freshly-read user row, NOT from the token
// body. A token is valid for up to a day, so trusting its claims meant a user
// who had been deactivated, deleted, demoted from ADMIN, or unlinked from their
// member record kept those privileges until it expired. The lookup is a single
// primary-key read.
export async function authenticate(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(unauthorized("Missing or malformed Authorization header"));
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return next(unauthorized("Invalid or expired token"));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, role: true, memberId: true, status: true },
    });

    // Same message either way — whether the account is gone or merely disabled
    // is not something an unauthenticated caller needs to learn.
    if (!user || user.status !== "ACTIVE") {
      return next(unauthorized("Session is no longer valid. Please sign in again."));
    }

    req.user = {
      id: user.id,
      role: user.role,
      memberId: user.memberId ?? null,
      username: user.username,
    };
    next();
  } catch (err) {
    next(err);
  }
}

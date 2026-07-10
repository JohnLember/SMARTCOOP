import { verifyToken } from "../utils/jwt.js";
import { unauthorized } from "../utils/httpError.js";

// Verifies the Bearer token and attaches { id, role, memberId } to req.user.
export function authenticate(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(unauthorized("Missing or malformed Authorization header"));
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      memberId: payload.memberId ?? null,
      username: payload.username,
    };
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}

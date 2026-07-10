import { forbidden } from "../utils/httpError.js";

// Guards a route to one or more roles. Use after `authenticate`.
// Example: router.post("/", authenticate, requireRole("ADMIN", "STAFF"), handler)
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(forbidden("You do not have access to this resource"));
    }
    next();
  };
}

import { forbidden } from "./httpError.js";

// Authorization helpers for records that belong to a member.
//
// These exist because the previous checks were written as "deny if MEMBER and
// not the owner", which is a denylist: any role that is neither MEMBER nor
// staff — MAO, and any role added later — fell through to the unrestricted
// branch and could read every member's deliveries, receipts, loans and credit
// scores. MAO is a municipal reporting account and is scoped to the aggregate,
// non-sensitive views under /api/mao.
//
// Always ask "is this caller allowed", never "is this caller forbidden".

export const isStaff = (user) => user?.role === "ADMIN" || user?.role === "STAFF";

export const isOwnMember = (user, memberId) =>
  user?.role === "MEMBER" &&
  user.memberId != null &&
  memberId != null &&
  Number(user.memberId) === Number(memberId);

// Staff may act on any member; a member only on themselves. Everyone else is
// refused. `what` completes the sentence "You can only view your own ...".
export function assertMemberAccess(user, memberId, what = "records") {
  if (isStaff(user) || isOwnMember(user, memberId)) return;
  if (user?.role === "MEMBER") throw forbidden(`You can only view your own ${what}`);
  throw forbidden("You do not have access to this resource");
}

// For list endpoints: staff see everything, a member sees only their own rows,
// anyone else is refused. Returns the memberId to scope the query by, or null
// for "no scoping" (staff).
export function memberScopeFor(user) {
  if (isStaff(user)) return null;
  if (user?.role === "MEMBER" && user.memberId != null) return Number(user.memberId);
  throw forbidden("You do not have access to this resource");
}

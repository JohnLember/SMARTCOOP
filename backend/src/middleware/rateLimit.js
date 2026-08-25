import rateLimit from "express-rate-limit";

// Brute-force protection. The login endpoint previously accepted unlimited
// attempts, so a four-account cooperative with human-chosen passwords could be
// guessed at network speed.
//
// Two deliberate choices:
//  - No permanent lockout. Locking an account on failed attempts lets anyone
//    deny service to a known username; a rolling window throttles the attacker
//    without handing them that lever.
//  - Failed attempts only (`skipSuccessfulRequests`), so a busy shared office
//    IP signing in legitimately all morning never trips the limit.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts. Please wait a few minutes and try again." },
});

// The public membership application form: unauthenticated and it writes rows,
// so it is the obvious spam target.
export const publicWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many submissions from this network. Please try again later." },
});

// Everything else. Loose enough that normal staff work never notices it, tight
// enough to blunt scraping of the member roster or automated enumeration.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});

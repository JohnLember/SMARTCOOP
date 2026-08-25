import jwt from "jsonwebtoken";

// The signing key is the root of the whole auth system: anyone who knows it can
// mint a token for any user and any role. It used to fall back to the literal
// string "dev-secret" when JWT_SECRET was unset, which meant a deployment that
// forgot the env var was silently forgeable by anyone who has read this file.
// Fail to boot instead — a server that will not start is far better than one
// that accepts attacker-signed ADMIN tokens.
const SECRET = process.env.JWT_SECRET;
const PLACEHOLDER = "change-this-to-a-long-random-string";

if (!SECRET || SECRET.length < 32 || SECRET === PLACEHOLDER) {
  throw new Error(
    "JWT_SECRET is missing, too short, or still the .env.example placeholder. " +
      "Set it to at least 32 random characters, e.g. " +
      '`node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"`.'
  );
}

const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

// The algorithm is pinned on both sides. Without an explicit allowlist a token
// can ask to be verified with a different algorithm than the one we signed with
// (the classic "alg" confusion / "none" attacks).
const ALGORITHM = "HS256";

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN, algorithm: ALGORITHM });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET, { algorithms: [ALGORITHM] });
}

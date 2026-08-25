import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import applicationsRoutes from "./modules/applications/applications.routes.js";
import loanApplicationsRoutes from "./modules/loanApplications/loanApplications.routes.js";
import membersRoutes from "./modules/members/members.routes.js";
import barangaysRoutes from "./modules/barangays/barangays.routes.js";
import notificationsRoutes from "./modules/notifications/notifications.routes.js";
import productionRoutes from "./modules/production/production.routes.js";
import financeRoutes from "./modules/finance/finance.routes.js";
import maoRoutes from "./modules/mao/mao.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimit.js";

const app = express();

// Behind a reverse proxy (nginx, a PaaS router) req.ip is the proxy unless we
// trust the forwarded header — without this every client shares one rate-limit
// bucket. Kept to a single hop so the header cannot be spoofed further upstream.
if (process.env.TRUST_PROXY) app.set("trust proxy", 1);

app.use(helmet());

// Allowed browser origins. This used to fall back to "*", which let any site on
// the internet call this authenticated API from a victim's browser. There is no
// safe wildcard for an app that serves member records, so a missing/blank
// CORS_ORIGIN now means "no cross-origin access" rather than "everyone".
const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn(
    "[security] CORS_ORIGIN is not set — all cross-origin browser requests will be refused."
  );
}

app.use(
  cors({
    // Same-origin and non-browser callers send no Origin header; those are not
    // what CORS defends against, so they pass through.
    origin: (origin, cb) =>
      !origin || allowedOrigins.includes(origin)
        ? cb(null, true)
        : cb(new Error("Origin not allowed by CORS")),
    credentials: true,
  })
);

// Bounded request bodies. The default is 100kb; member profile photos are sent
// as base64 data URLs, so the JSON parser needs headroom — but an explicit cap
// keeps a single request from tying up memory.
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// Combined format in production keeps a real access log; "dev" is for humans.
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use("/api", apiLimiter);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/loan-applications", loanApplicationsRoutes);
app.use("/api/members", membersRoutes);
app.use("/api/barangays", barangaysRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/mao", maoRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

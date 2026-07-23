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

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));

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

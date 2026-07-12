import { Router } from "express";
import * as controller from "./loanApplications.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();
router.use(authenticate);

// Members submit and read their own; staff read all and review. Role checks
// live in the controller so both audiences share these routes.
router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.getById);
router.post("/:id/approve", controller.approve);
router.post("/:id/reject", controller.reject);

export default router;

import { Router } from "express";
import * as controller from "./mao.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";

const router = Router();
// MAO Dashboard is exclusive to the MAO role.
const maoAccess = requireRole("MAO");

router.use(authenticate, maoAccess);

// Aggregated production analytics (read-only).
router.get("/stats", controller.stats);

// Minimal member lookup for the recipient picker.
router.get("/members", controller.membersLookup);

// Affected-area tagging.
router.get("/tags", controller.listTags);
router.post("/tags", controller.createTag);
router.patch("/tags/:id/resolve", controller.resolveTag);

// Support programs + recipients.
router.get("/programs", controller.listPrograms);
router.get("/programs/:id", controller.getProgram);
router.post("/programs", controller.createProgram);
router.put("/programs/:id", controller.updateProgram);
router.post("/programs/:id/recipients", controller.addRecipient);

export default router;

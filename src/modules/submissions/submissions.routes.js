import { Router } from "express";
import {
  runSubmissionController,
  sendEventsController,
  startSubmissionController,
  submitSubmissionController,
} from "./submissions.controller.js";

const router = Router();

router.post("/start", startSubmissionController);
router.post("/run", runSubmissionController);
router.post("/:id/submit", submitSubmissionController);
router.post("/:id/events", sendEventsController);

export { router as submissionsRoutes };

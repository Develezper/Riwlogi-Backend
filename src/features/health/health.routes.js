import { Router } from "express";
import { healthController, healthLiveController, healthReadyController } from "./health.controller.js";

const router = Router();

router.get("/", healthController);
router.get("/live", healthLiveController);
router.get("/ready", healthReadyController);

export { router as healthRoutes };

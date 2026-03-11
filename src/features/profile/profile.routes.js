import { Router } from "express";
import { profileController, profileSubmissionsController } from "./profile.controller.js";

const router = Router();

router.get("/me", profileController);
router.get("/submissions", profileSubmissionsController);

export { router as profileRoutes };

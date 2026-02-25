import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { loginController, logoutController, registerController } from "./auth.controller.js";

const router = Router();

router.post("/login", loginController);
router.post("/register", registerController);
router.post("/logout", requireAuth, logoutController);

export { router as authRoutes };

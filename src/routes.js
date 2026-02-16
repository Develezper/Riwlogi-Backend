import { Router } from "express";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { leaderboardRoutes } from "./modules/leaderboard/leaderboard.routes.js";
import { problemsRoutes } from "./modules/problems/problems.routes.js";
import { profileRoutes } from "./modules/profile/profile.routes.js";
import { submissionsRoutes } from "./modules/submissions/submissions.routes.js";
import { requireAuth } from "./middlewares/auth.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    status: "ok",
    service: "riwlog-backend",
    health: {
      method: "GET",
      path: "/health",
    },
  });
});

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/problems", problemsRoutes);
router.use("/submissions", requireAuth, submissionsRoutes);
router.use("/leaderboard", leaderboardRoutes);
router.use("/profile", requireAuth, profileRoutes);

export { router as apiRoutes };

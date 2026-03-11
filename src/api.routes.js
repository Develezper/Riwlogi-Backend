import { Router } from "express";
import { authRateLimiter, submissionsRateLimiter } from "./config/security.js";
import { adminRoutes } from "./features/admin/admin.routes.js";
import { authRoutes } from "./features/auth/auth.routes.js";
import { healthRoutes } from "./features/health/health.routes.js";
import { leaderboardRoutes } from "./features/leaderboard/leaderboard.routes.js";
import { problemsRoutes } from "./features/problems/problems.routes.js";
import { profileRoutes } from "./features/profile/profile.routes.js";
import { submissionsRoutes } from "./features/submissions/submissions.routes.js";
import { requireAuth } from "./middleware/auth.js";
import { openApiJsonController } from "./openapi/openapi.controller.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    status: "ok",
    service: "riwlogi-backend",
    health: {
      method: "GET",
      path: "/health",
    },
  });
});

router.get("/openapi.json", openApiJsonController);
router.use("/health", healthRoutes);
router.use("/auth", authRateLimiter, authRoutes);
router.use("/problems", problemsRoutes);
router.use("/admin", requireAuth, adminRoutes);
router.use("/submissions", submissionsRateLimiter, requireAuth, submissionsRoutes);
router.use("/leaderboard", leaderboardRoutes);
router.use("/profile", requireAuth, profileRoutes);

export { router as apiRoutes };

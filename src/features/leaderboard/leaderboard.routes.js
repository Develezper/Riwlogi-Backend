import { Router } from "express";
import { leaderboardController } from "./leaderboard.controller.js";

const router = Router();

router.get("/", leaderboardController);

export { router as leaderboardRoutes };

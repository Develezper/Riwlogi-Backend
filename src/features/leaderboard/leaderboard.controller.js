import { listLeaderboard } from "./leaderboard.service.js";

export function leaderboardController(req, res) {
  const items = listLeaderboard({ timeframe: req.query?.timeframe });
  res.json({ items });
}

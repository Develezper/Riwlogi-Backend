import { listLeaderboardPage } from "./leaderboard.service.js";
import { parsePaginationQuery } from "../../utils/pagination.js";

export async function leaderboardController(req, res) {
  const pagination = parsePaginationQuery(req.query);
  const payload = await listLeaderboardPage({
    timeframe: req.query?.timeframe,
    page: pagination.page,
    limit: pagination.limit,
  });
  res.json(payload);
}

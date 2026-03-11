import { listLeaderboard } from "./leaderboard.service.js";
import { paginateItems, parsePaginationQuery } from "../../utils/pagination.js";

export async function leaderboardController(req, res) {
  const allItems = await listLeaderboard({ timeframe: req.query?.timeframe });
  const pagination = parsePaginationQuery(req.query);
  const payload = paginateItems(allItems, pagination);
  res.json(payload);
}

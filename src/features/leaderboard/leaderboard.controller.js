import { paginateItems, parsePaginationQuery } from "../../utils/pagination.js";
import { listLeaderboard } from "./leaderboard.service.js";

export function leaderboardController(req, res) {
  const allItems = listLeaderboard({ timeframe: req.query?.timeframe });
  const pagination = parsePaginationQuery(req.query);
  const payload = paginateItems(allItems, pagination);
  res.json(payload);
}

import { getProfile, getProfileSubmissions } from "./profile.service.js";
import { paginateItems, parsePaginationQuery } from "../../utils/pagination.js";

export function profileController(req, res) {
  const payload = getProfile(req.auth.userId);
  res.json(payload);
}

export function profileSubmissionsController(req, res) {
  const allItems = getProfileSubmissions(req.auth.userId);
  const pagination = parsePaginationQuery(req.query);
  const payload = paginateItems(allItems, pagination);
  res.json(payload);
}

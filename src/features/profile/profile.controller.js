import { getProfile, getProfileSubmissions } from "./profile.service.js";
import { paginateItems, parsePaginationQuery } from "../../utils/pagination.js";

export async function profileController(req, res) {
  const payload = await getProfile(req.auth.userId);
  res.json(payload);
}

export async function profileSubmissionsController(req, res) {
  const allItems = await getProfileSubmissions(req.auth.userId);
  const pagination = parsePaginationQuery(req.query);
  const payload = paginateItems(allItems, pagination);
  res.json(payload);
}

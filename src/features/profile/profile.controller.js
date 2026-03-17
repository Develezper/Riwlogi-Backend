import { getProfile, getProfileSubmissionsPage } from "./profile.service.js";
import { parsePaginationQuery } from "../../utils/pagination.js";

export async function profileController(req, res) {
  const payload = await getProfile(req.auth.userId);
  res.json(payload);
}

export async function profileSubmissionsController(req, res) {
  const pagination = parsePaginationQuery(req.query);
  const payload = await getProfileSubmissionsPage(req.auth.userId, pagination);
  res.json(payload);
}

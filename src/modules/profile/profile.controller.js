import { getProfile, getProfileSubmissions } from "./profile.service.js";

export function profileController(req, res) {
  const payload = getProfile(req.auth.userId);
  res.json(payload);
}

export function profileSubmissionsController(req, res) {
  const items = getProfileSubmissions(req.auth.userId);
  res.json({ items });
}

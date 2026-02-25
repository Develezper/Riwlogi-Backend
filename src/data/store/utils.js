import { nowIso } from "../../utils/time.js";
import { uid } from "../../utils/id.js";

export function normalizeUser(user) {
  return {
    id: String(user.id || uid("user")),
    username: String(user.username || "").trim(),
    email: String(user.email || "").trim().toLowerCase(),
    password_hash: String(user.password_hash || ""),
    role: String(user.role || "user").toLowerCase(),
    display_name: String(user.display_name || user.username || "").trim(),
    created_at: String(user.created_at || nowIso()),
  };
}

export function toId(value) {
  return String(value || "").trim();
}

export function toLookupKey(value) {
  return toId(value).toLowerCase();
}

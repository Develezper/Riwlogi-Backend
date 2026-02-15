import { nowIso } from "../../utils/time.js";

export function getHealth() {
  return {
    ok: true,
    service: "riwlog-backend",
    timestamp: nowIso(),
  };
}

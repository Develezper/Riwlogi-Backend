import { getHealth } from "./health.service.js";

export function healthController(_req, res) {
  res.json(getHealth());
}

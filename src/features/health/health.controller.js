import { getHealth, getHealthLive, getHealthReady } from "./health.service.js";

export function healthController(_req, res) {
  res.json(getHealth());
}

export function healthLiveController(_req, res) {
  res.json(getHealthLive());
}

export async function healthReadyController(_req, res) {
  const payload = await getHealthReady();
  res.status(payload.ok ? 200 : 503).json(payload);
}

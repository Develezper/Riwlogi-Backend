import { env } from "../config/env.js";
import { httpClient } from "../config/http-client.js";

function trimTrailingSlash(value) {
  const text = String(value || "").trim();
  return text.endsWith("/") ? text.slice(0, -1) : text;
}

function buildHealthUrl() {
  const baseUrl = trimTrailingSlash(env.CLASSIFIER_API_BASE);
  if (!baseUrl) return "";
  return `${baseUrl}/health`;
}

const healthUrl = buildHealthUrl();
const HEALTH_TIMEOUT_MS = Math.min(2_000, env.CLASSIFIER_API_TIMEOUT_MS);
const HEALTH_PING_COOLDOWN_MS = 10 * 60 * 1_000;

let lastHealthPingAtMs = 0;
let healthPingInFlight = false;

export function classifierHealthPing(_req, _res, next) {
  if (healthUrl) {
    const nowMs = Date.now();
    const isInCooldown = nowMs - lastHealthPingAtMs < HEALTH_PING_COOLDOWN_MS;

    if (healthPingInFlight || isInCooldown) {
      next();
      return;
    }

    lastHealthPingAtMs = nowMs;
    healthPingInFlight = true;

    // Fire-and-forget health ping to keep external API warm.
    void httpClient
      .get(healthUrl, {
        timeout: HEALTH_TIMEOUT_MS,
        validateStatus: () => true,
      })
      .catch(() => {
        // Intentionally ignored: this middleware must never block or fail requests.
      })
      .finally(() => {
        healthPingInFlight = false;
      });
  }

  next();
}

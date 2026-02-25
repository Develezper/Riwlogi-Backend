import { env } from "../../config/env.js";
import { checkStoreReadiness } from "../../data/store.js";

function basePayload() {
  return {
    service: "riwlogi-backend",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime_s: Math.floor(process.uptime()),
  };
}

export function getHealth() {
  return { ok: true, status: "ok" };
}

export function getHealthLive() {
  return {
    ok: true,
    status: "alive",
    ...basePayload(),
    checks: {
      process: "up",
      event_loop: "up",
    },
  };
}

export async function getHealthReady() {
  try {
    const rawStoreStatus = await checkStoreReadiness();
    const storeStatus = {
      ok: true,
      provider: env.STORE_PROVIDER,
      ...(rawStoreStatus && typeof rawStoreStatus === "object" ? rawStoreStatus : {}),
    };

    if (!storeStatus.ok) {
      return {
        ok: false,
        status: "not_ready",
        ...basePayload(),
        checks: {
          store: storeStatus,
        },
      };
    }

    return {
      ok: true,
      status: "ready",
      ...basePayload(),
      checks: {
        store: storeStatus,
      },
    };
  } catch (error) {
    const errorMessage =
      env.NODE_ENV === "production"
        ? "store_unavailable"
        : error instanceof Error
          ? error.message
          : "unknown_error";

    return {
      ok: false,
      status: "not_ready",
      ...basePayload(),
      checks: {
        store: {
          ok: false,
          provider: env.STORE_PROVIDER,
          error: errorMessage,
        },
      },
    };
  }
}

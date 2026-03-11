import { beforeEach, describe, expect, it } from "bun:test";
import { store } from "../src/data/store.js";
import { getHealth, getHealthLive, getHealthReady } from "../src/features/health/health.service.js";

beforeEach(() => store.reset());

describe("health checks", () => {
  it("returns legacy basic health payload", () => {
    expect(getHealth()).toEqual({ ok: true, status: "ok" });
  });

  it("returns detailed liveness payload", () => {
    const payload = getHealthLive();

    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("alive");
    expect(payload.checks.process).toBe("up");
    expect(payload.checks.event_loop).toBe("up");
    expect(Number.isInteger(payload.uptime_s)).toBe(true);
  });

  it("returns readiness payload", async () => {
    const payload = await getHealthReady();

    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("ready");
    expect(payload.checks.store.ok).toBe(true);
    expect(["memory", "postgres"]).toContain(payload.checks.store.provider);
  });

  it("returns not_ready when store reports unhealthy", async () => {
    const originalHealthCheck = store.healthCheck;
    store.healthCheck = async () => ({
      ok: false,
      provider: store.provider || "memory",
      error: "store_unavailable",
    });

    try {
      const payload = await getHealthReady();
      expect(payload.ok).toBe(false);
      expect(payload.status).toBe("not_ready");
      expect(payload.checks.store.ok).toBe(false);
    } finally {
      store.healthCheck = originalHealthCheck;
    }
  });
});

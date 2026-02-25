import { beforeEach, describe, expect, it } from "bun:test";
import { store } from "../src/data/store.js";
import { login, logout } from "../src/features/auth/auth.service.js";
import { HttpError } from "../src/utils/http-error.js";

beforeEach(() => {
  return store.reset();
});

describe("auth sessions", () => {
  it("issues and revokes sessions", async () => {
    const result = await login({ identifier: "demo@riwlogi.dev", password: "123456" });

    expect(typeof result.access_token).toBe("string");
    expect(result.access_token.length).toBeGreaterThan(20);
    expect(Number.isFinite(new Date(result.expires_at).getTime())).toBe(true);

    const session = await store.findSession(result.access_token);
    expect(session).not.toBeNull();

    const loggedOut = await logout(result.access_token);
    expect(loggedOut.ok).toBe(true);
    expect(await store.findSession(result.access_token)).toBeNull();
  });

  it("rejects invalid logout tokens", async () => {
    try {
      await logout("invalid-token");
      throw new Error("Expected logout to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect(error.status).toBe(401);
    }
  });
});

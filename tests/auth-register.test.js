import { beforeEach, describe, expect, it } from "bun:test";
import { store } from "../src/data/store.js";
import { register } from "../src/features/auth/auth.service.js";
import { HttpError } from "../src/utils/http-error.js";

beforeEach(() => {
  return store.reset();
});

describe("auth register", () => {
  it("accepts a valid email format", async () => {
    const result = await register({
      username: "new_user_1",
      email: "new.user+tag@sub.example.com",
      password: "123456",
    });

    expect(typeof result.access_token).toBe("string");
    expect(result.user.email).toBe("new.user+tag@sub.example.com");
  });

  it("rejects invalid email formats", async () => {
    const invalidEmails = [
      "invalid-email",
      "user@@example.com",
      ".user@example.com",
      "user..name@example.com",
      "user@example",
      "user@-example.com",
      "user@example-.com",
      "user@example.c",
      "user@exa mple.com",
    ];

    for (const [index, email] of invalidEmails.entries()) {
      try {
        await register({
          username: `user_${index + 1}`,
          email,
          password: "123456",
        });
        throw new Error(`Expected register to fail for ${email}`);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect(error.status).toBe(400);
        expect(error.message).toBe("Debes enviar un email válido.");
      }
    }
  });
});

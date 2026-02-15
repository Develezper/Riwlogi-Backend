import { randomBytes } from "node:crypto";

export function uid(prefix) {
  const random = randomBytes(5).toString("hex");
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function sessionToken() {
  return randomBytes(24).toString("hex");
}

export function requestId() {
  return randomBytes(8).toString("hex");
}

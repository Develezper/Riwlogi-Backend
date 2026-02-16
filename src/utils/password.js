import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password) {
  const normalized = String(password || "");
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(normalized, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const normalized = String(password || "");
  const [salt, existingHash] = String(storedHash || "").split(":");

  if (!salt || !existingHash) return false;

  const computed = scryptSync(normalized, salt, KEY_LENGTH).toString("hex");

  try {
    return timingSafeEqual(Buffer.from(existingHash, "hex"), Buffer.from(computed, "hex"));
  } catch {
    return false;
  }
}

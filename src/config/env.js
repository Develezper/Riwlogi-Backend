import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function asPort(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : fallback;
}

function asPositiveInt(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  if (parsed < min) return fallback;
  if (parsed > max) return fallback;
  return parsed;
}

function asList(value, fallback = []) {
  const raw = String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return raw.length ? raw : fallback;
}

const resolved = {
  NODE_ENV: process.env.NODE_ENV || "development",
  HOST: process.env.HOST || "localhost",
  PORT: asPort(process.env.PORT, 8000),
  API_PREFIX: process.env.API_PREFIX || "/api",
  CORS_ORIGINS: asList(process.env.CORS_ORIGINS, ["*"]),
  CLASSIFIER_API_BASE: String(process.env.CLASSIFIER_API_BASE || "").trim(),
  SESSION_TTL_HOURS: asPositiveInt(process.env.SESSION_TTL_HOURS, 24, { min: 1, max: 24 * 30 }),
  MAX_EVENTS_PER_SUBMISSION: asPositiveInt(process.env.MAX_EVENTS_PER_SUBMISSION, 2000, {
    min: 100,
    max: 10000,
  }),
};

export const env = Object.freeze(resolved);

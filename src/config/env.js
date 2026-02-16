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
};

export const env = Object.freeze(resolved);

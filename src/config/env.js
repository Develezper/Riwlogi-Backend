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

const resolved = {
  NODE_ENV: process.env.NODE_ENV || "development",
  HOST: process.env.HOST || "127.0.0.1",
  PORT: asPort(process.env.PORT, 8000),
  API_PREFIX: process.env.API_PREFIX || "/api",
  CLASSIFIER_API_BASE: String(process.env.CLASSIFIER_API_BASE || "").trim(),
};

export const env = Object.freeze(resolved);

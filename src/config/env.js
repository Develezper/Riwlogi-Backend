import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function asList(value, fallback = []) {
  const raw = String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return raw.length ? raw : fallback;
}

const envSchema = z.object({
  NODE_ENV: z.preprocess((value) => String(value || "").trim() || "development", z.string()),
  HOST: z.preprocess((value) => String(value || "").trim() || "localhost", z.string()),
  PORT: z.coerce.number().int().min(1).max(65535).catch(8000),
  API_PREFIX: z.preprocess((value) => String(value || "").trim() || "/api", z.string()),
  CORS_ORIGINS: z.preprocess((value) => asList(value, ["*"]), z.array(z.string()).min(1)).catch(["*"]),
  CLASSIFIER_API_BASE: z.preprocess((value) => String(value || "").trim(), z.string()),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 30).catch(24),
  MAX_EVENTS_PER_SUBMISSION: z.coerce.number().int().min(100).max(10000).catch(2000),
});

const resolved = envSchema.parse(process.env);

export const env = Object.freeze(resolved);

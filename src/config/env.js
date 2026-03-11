import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initialEnv = { ...process.env };
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env.local"), override: true });
Object.entries(initialEnv).forEach(([key, value]) => {
  if (value !== undefined) {
    process.env[key] = value;
  }
});

function asList(value, fallback = []) {
  const raw = String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return raw.length ? raw : fallback;
}

function asBoolean(value, fallback = false) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

const envSchema = z.object({
  NODE_ENV: z.preprocess((value) => String(value || "").trim() || "development", z.string()),
  LOG_LEVEL: z
    .preprocess((value) => String(value || "").trim().toLowerCase() || "info", z.string())
    .catch("info"),
  LOG_PRETTY: z.preprocess((value) => asBoolean(value, true), z.boolean()).catch(true),
  TRUST_PROXY: z.preprocess((value) => asBoolean(value, false), z.boolean()).catch(false),
  HOST: z.preprocess((value) => String(value || "").trim() || "localhost", z.string()),
  PORT: z.coerce.number().int().min(1).max(65535).catch(8000),
  API_PREFIX: z.preprocess((value) => String(value || "").trim() || "/api", z.string()),
  CORS_ORIGINS: z.preprocess((value) => asList(value, ["*"]), z.array(z.string()).min(1)).catch(["*"]),
  CLASSIFIER_API_BASE: z.preprocess((value) => String(value || "").trim(), z.string()),
  START_CLASSIFIER_API: z.preprocess((value) => asBoolean(value, false), z.boolean()).catch(false),
  CLASSIFIER_API_HOST: z.preprocess((value) => String(value || "").trim() || "127.0.0.1", z.string()),
  CLASSIFIER_API_PORT: z.coerce.number().int().min(1).max(65535).catch(8001),
  CLASSIFIER_API_PYTHON: z.preprocess((value) => String(value || "").trim() || "python", z.string()),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 30).catch(24),
  MAX_EVENTS_PER_SUBMISSION: z.coerce.number().int().min(100).max(10000).catch(2000),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).max(24 * 60 * 60 * 1000).catch(15 * 60 * 1000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(10000).catch(50),
  SUBMISSIONS_RATE_LIMIT_WINDOW_MS: z
    .coerce.number()
    .int()
    .min(1000)
    .max(24 * 60 * 60 * 1000)
    .catch(60 * 1000),
  SUBMISSIONS_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100000).catch(240),
  STORE_PROVIDER: z
    .preprocess((value) => String(value || "").trim().toLowerCase() || "memory", z.enum(["memory", "postgres"]))
    .catch("memory"),
  DATABASE_URL: z.preprocess((value) => String(value || "").trim(), z.string()),
  DB_HOST: z.preprocess((value) => String(value || "").trim(), z.string()),
  DB_PORT: z.coerce.number().int().min(1).max(65535).catch(5432),
  DB_NAME: z.preprocess((value) => String(value || "").trim(), z.string()),
  DB_USER: z.preprocess((value) => String(value || "").trim(), z.string()),
  DB_PASSWORD: z.preprocess((value) => String(value || "").trim(), z.string()),
  DB_SSL_MODE: z
    .preprocess((value) => String(value || "").trim().toLowerCase() || "require", z.enum(["disable", "require"]))
    .catch("require"),
});

const resolved = envSchema.parse(process.env);

export const env = Object.freeze(resolved);

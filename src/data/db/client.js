import pg from "pg";
import { Kysely, PostgresDialect } from "kysely";
import { env } from "../../config/env.js";

const { Pool } = pg;

function resolveConnectionUrl() {
  if (env.DATABASE_URL) return env.DATABASE_URL;

  if (!env.DB_HOST || !env.DB_NAME || !env.DB_USER || !env.DB_PASSWORD) {
    throw new Error(
      "STORE_PROVIDER=postgres requiere DATABASE_URL o DB_HOST, DB_NAME, DB_USER y DB_PASSWORD.",
    );
  }

  const user = encodeURIComponent(env.DB_USER);
  const password = encodeURIComponent(env.DB_PASSWORD);
  const database = encodeURIComponent(env.DB_NAME);

  return `postgres://${user}:${password}@${env.DB_HOST}:${env.DB_PORT}/${database}`;
}

export function createPostgresDb() {
  const connectionString = resolveConnectionUrl();
  const pool = new Pool({
    connectionString,
    ssl: env.DB_SSL_MODE === "require" ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

  const db = new Kysely({
    dialect: new PostgresDialect({ pool }),
  });

  return { db, pool };
}

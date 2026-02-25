import { logger } from "../src/config/logger.js";
import { createPostgresDb } from "../src/data/db/client.js";
import { runMigrations } from "../src/data/db/migrator.js";

const { db } = createPostgresDb();

try {
  await runMigrations(db, logger);
  logger.info({ status: "ok" }, "Migrations completed");
} catch (error) {
  logger.error({ err: error }, "Migrations failed");
  process.exitCode = 1;
} finally {
  await db.destroy();
}

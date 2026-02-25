import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileMigrationProvider, Migrator } from "kysely";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationFolder = path.join(__dirname, "migrations");

export async function runMigrations(db, logger) {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder,
    }),
    migrationTableName: "kysely_migrations",
    migrationLockTableName: "kysely_migration_lock",
  });

  const { error, results } = await migrator.migrateToLatest();

  if (results?.length) {
    results.forEach((result) => {
      const level = result.status === "Success" ? "info" : "warn";
      logger?.[level]?.(
        {
          migration: result.migrationName,
          status: result.status,
        },
        "DB migration",
      );
    });
  }

  if (error) {
    logger?.error?.({ err: error }, "Migration failed");
    throw error;
  }
}

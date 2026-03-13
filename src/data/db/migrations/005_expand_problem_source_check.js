<<<<<<< HEAD
import { sql } from "kysely";

export async function up(db) {
  await sql`ALTER TABLE problems DROP CONSTRAINT IF EXISTS problems_source_check`.execute(db);
  await sql`ALTER TABLE problems
    ADD CONSTRAINT problems_source_check CHECK (source IN ('seed', 'handoff', 'fallback', 'base', 'custom', 'ai'))`.execute(db);
}

export async function down(db) {
  await sql`ALTER TABLE problems DROP CONSTRAINT IF EXISTS problems_source_check`.execute(db);
  await sql`ALTER TABLE problems
    ADD CONSTRAINT problems_source_check CHECK (source IN ('seed', 'handoff', 'base', 'custom', 'ai'))`.execute(db);
=======
export async function up() {
  // Kept as a no-op to preserve migration history compatibility.
}

export async function down() {
  // No schema changes to rollback.
>>>>>>> main
}

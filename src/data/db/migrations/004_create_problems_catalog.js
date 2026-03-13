<<<<<<< HEAD
import { sql } from "kysely";

export async function up(db) {
  await db.schema
    .createTable("problems")
    .addColumn("id", "text", (column) => column.primaryKey())
    .addColumn("slug", "text", (column) => column.notNull().unique())
    .addColumn("title", "text", (column) => column.notNull())
    .addColumn("difficulty", "integer", (column) => column.notNull().defaultTo(1))
    .addColumn("tags", "jsonb", (column) => column.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("acceptance", "double precision", (column) => column.notNull().defaultTo(0))
    .addColumn("submissions", "integer", (column) => column.notNull().defaultTo(0))
    .addColumn("description", "text")
    .addColumn("examples", "jsonb", (column) => column.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("constraints", "jsonb", (column) => column.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("statement_md", "text", (column) => column.notNull())
    .addColumn("starter_code", "jsonb", (column) => column.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("stages", "jsonb", (column) => column.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("stages_count", "integer", (column) => column.notNull().defaultTo(1))
    .addColumn("status", "text", (column) => column.notNull().defaultTo("published"))
    .addColumn("source", "text", (column) => column.notNull().defaultTo("custom"))
    .addColumn("last_generated_prompt", "text", (column) => column.notNull().defaultTo(""))
    .addColumn("created_at", "timestamptz", (column) => column.notNull())
    .addColumn("updated_at", "timestamptz", (column) => column.notNull())
    .execute();

  await sql`ALTER TABLE problems
    ADD CONSTRAINT problems_difficulty_check CHECK (difficulty BETWEEN 1 AND 3)`.execute(db);

  await sql`ALTER TABLE problems
    ADD CONSTRAINT problems_status_check CHECK (status IN ('draft', 'published', 'archived'))`.execute(db);

  await sql`ALTER TABLE problems
    ADD CONSTRAINT problems_source_check CHECK (source IN ('seed', 'handoff', 'fallback', 'base', 'custom', 'ai'))`.execute(db);

  await db.schema.createIndex("problems_slug_lower_unique_idx").on("problems").expression(sql`lower(slug)`).unique().execute();
  await db.schema.createIndex("problems_title_lower_idx").on("problems").expression(sql`lower(title)`).execute();
  await db.schema.createIndex("problems_difficulty_idx").on("problems").column("difficulty").execute();
}

export async function down(db) {
  await db.schema.dropIndex("problems_slug_lower_unique_idx").ifExists().execute();
  await db.schema.dropIndex("problems_title_lower_idx").ifExists().execute();
  await db.schema.dropIndex("problems_difficulty_idx").ifExists().execute();
  await db.schema.dropTable("problems").ifExists().execute();
=======
export async function up() {
  // Kept as a no-op to preserve migration history compatibility.
}

export async function down() {
  // No schema changes to rollback.
>>>>>>> main
}

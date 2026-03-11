import { sql } from "kysely";

export async function up(db) {
  await db.schema
    .createTable("submissions")
    .addColumn("id", "text", (column) => column.primaryKey())
    .addColumn("user_id", "text", (column) => column.notNull().references("users.id").onDelete("cascade"))
    .addColumn("problem_id", "text", (column) => column.notNull())
    .addColumn("problem_title", "text", (column) => column.notNull())
    .addColumn("language", "text", (column) => column.notNull())
    .addColumn("code", "text", (column) => column.notNull().defaultTo(""))
    .addColumn("stage_results", "jsonb", (column) => column.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("runtime_ms", "integer", (column) => column.notNull().defaultTo(0))
    .addColumn("final_score", "integer", (column) => column.notNull().defaultTo(0))
    .addColumn("verdict", "text", (column) => column.notNull().defaultTo("pending"))
    .addColumn("events", "jsonb", (column) => column.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("created_at", "timestamptz", (column) => column.notNull())
    .addColumn("updated_at", "timestamptz", (column) => column.notNull())
    .addColumn("submitted_at", "timestamptz")
    .execute();

  await db.schema.createIndex("submissions_user_id_idx").on("submissions").column("user_id").execute();
  await db.schema.createIndex("submissions_created_at_idx").on("submissions").column("created_at").execute();
}

export async function down(db) {
  await db.schema.dropIndex("submissions_user_id_idx").ifExists().execute();
  await db.schema.dropIndex("submissions_created_at_idx").ifExists().execute();
  await db.schema.dropTable("submissions").ifExists().execute();
}

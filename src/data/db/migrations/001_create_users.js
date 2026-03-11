import { sql } from "kysely";

export async function up(db) {
  await db.schema
    .createTable("users")
    .addColumn("id", "text", (column) => column.primaryKey())
    .addColumn("username", "text", (column) => column.notNull().unique())
    .addColumn("email", "text", (column) => column.notNull().unique())
    .addColumn("password_hash", "text", (column) => column.notNull())
    .addColumn("role", "text", (column) => column.notNull().defaultTo("user"))
    .addColumn("display_name", "text", (column) => column.notNull())
    .addColumn("created_at", "timestamptz", (column) => column.notNull())
    .execute();

  await sql`ALTER TABLE users
    ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'))`.execute(db);

  await db.schema
    .createIndex("users_email_lower_unique_idx")
    .on("users")
    .expression(sql`lower(email)`)
    .unique()
    .execute();

  await db.schema
    .createIndex("users_username_lower_unique_idx")
    .on("users")
    .expression(sql`lower(username)`)
    .unique()
    .execute();
}

export async function down(db) {
  await db.schema.dropIndex("users_email_lower_unique_idx").ifExists().execute();
  await db.schema.dropIndex("users_username_lower_unique_idx").ifExists().execute();
  await db.schema.dropTable("users").ifExists().execute();
}

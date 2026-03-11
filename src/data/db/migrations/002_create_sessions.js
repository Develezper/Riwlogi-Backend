export async function up(db) {
  await db.schema
    .createTable("sessions")
    .addColumn("token", "text", (column) => column.primaryKey())
    .addColumn("user_id", "text", (column) => column.notNull().references("users.id").onDelete("cascade"))
    .addColumn("created_at", "timestamptz", (column) => column.notNull())
    .addColumn("expires_at", "timestamptz", (column) => column.notNull())
    .execute();

  await db.schema.createIndex("sessions_user_id_idx").on("sessions").column("user_id").execute();
  await db.schema.createIndex("sessions_expires_at_idx").on("sessions").column("expires_at").execute();
}

export async function down(db) {
  await db.schema.dropIndex("sessions_user_id_idx").ifExists().execute();
  await db.schema.dropIndex("sessions_expires_at_idx").ifExists().execute();
  await db.schema.dropTable("sessions").ifExists().execute();
}

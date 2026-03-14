import { sql } from "kysely";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { sessionToken, uid } from "../../utils/id.js";
import { hashPassword } from "../../utils/password.js";
import { nowIso } from "../../utils/time.js";
import { createPostgresDb } from "../db/client.js";
import { runMigrations } from "../db/migrator.js";
import { DEFAULT_USERS } from "../seeds.js";
import { normalizeUser, toId, toLookupKey } from "./utils.js";

const SESSION_TTL_MS = env.SESSION_TTL_HOURS * 60 * 60 * 1000;
const CONNECT_MAX_RETRIES = env.DB_CONNECT_MAX_RETRIES;
const CONNECT_DELAY_MS = env.DB_CONNECT_RETRY_DELAY_MS;
const CONNECT_MAX_DELAY_MS = env.DB_CONNECT_RETRY_MAX_DELAY_MS;
const CONNECT_BACKOFF = env.DB_CONNECT_RETRY_BACKOFF;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateRetryDelay(attempt) {
  const computed = Math.round(
    CONNECT_DELAY_MS * CONNECT_BACKOFF ** Math.max(0, attempt - 1),
  );
  return Math.min(CONNECT_MAX_DELAY_MS, Math.max(CONNECT_DELAY_MS, computed));
}

function asIso(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? nowIso() : parsed.toISOString();
}

function parseJson(value, fallback) {
  try {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "string") return JSON.parse(value);
    if (typeof value === "object") return value;
    return fallback;
  } catch {
    return fallback;
  }
}

function normalizeUserRow(row) {
  return normalizeUser({
    ...row,
    created_at: asIso(row.created_at),
  });
}

function normalizeSubmission(row) {
  const stageResults = parseJson(row.stage_results, {});
  const events = parseJson(row.events, []);

  return {
    id: String(row.id || ""),
    user_id: String(row.user_id || ""),
    problem_id: String(row.problem_id || ""),
    problem_title: String(row.problem_title || ""),
    language: String(row.language || "python").toLowerCase(),
    code: String(row.code || ""),
    stage_results: stageResults && typeof stageResults === "object" ? stageResults : {},
    runtime_ms: Number(row.runtime_ms || 0),
    final_score: Number(row.final_score || 0),
    verdict: String(row.verdict || "pending"),
    events: Array.isArray(events) ? events : [],
    created_at: asIso(row.created_at),
    updated_at: asIso(row.updated_at),
    submitted_at: row.submitted_at ? asIso(row.submitted_at) : null,
  };
}

function normalizeSession(row) {
  return {
    token: String(row.token || ""),
    user_id: String(row.user_id || ""),
    created_at: asIso(row.created_at),
    expires_at: asIso(row.expires_at),
  };
}

function toJsonb(value, fallback) {
  const resolved = value ?? fallback;
  try {
    return JSON.stringify(resolved);
  } catch {
    return JSON.stringify(fallback);
  }
}

export class PostgresStore {
  constructor() {
    const { db, pool } = createPostgresDb();
    this.provider = "postgres";
    this.db = db;
    this.pool = pool;
    this.readyPromise = null;
  }

  async bootstrap() {
    if (!this.readyPromise) {
      this.readyPromise = this.initializeWithRetry();
    }

    try {
      await this.readyPromise;
    } catch (error) {
      this.readyPromise = null;
      throw error;
    }
  }

  async initialize() {
    await runMigrations(this.db, logger);
    await this.seedUsersIfNeeded();
  }

  async initializeWithRetry() {
    let attempt = 0;

    while (attempt <= CONNECT_MAX_RETRIES) {
      attempt += 1;

      try {
        await this.initialize();

        if (attempt > 1) {
          logger.info(
            {
              provider: this.provider,
              attempt,
            },
            "Postgres connection recovered",
          );
        }

        return;
      } catch (error) {
        const retriesUsed = attempt - 1;
        const retriesRemaining = Math.max(0, CONNECT_MAX_RETRIES - retriesUsed);
        const canRetry = retriesRemaining > 0;

        logger.warn(
          {
            err: error,
            provider: this.provider,
            attempt,
            retries_remaining: retriesRemaining,
          },
          canRetry
            ? "Postgres init failed, retrying"
            : "Postgres init failed, retries exhausted",
        );

        if (!canRetry) {
          throw error;
        }

        await sleep(calculateRetryDelay(attempt));
      }
    }
  }

  async healthCheck() {
    const startedAt = Date.now();

    await this.bootstrap();
    await this.pool.query("select 1 as ok");

    return {
      ok: true,
      provider: this.provider,
      latency_ms: Date.now() - startedAt,
      checks: {
        migrations: "applied",
        postgres: "up",
      },
    };
  }

  async close() {
    await this.db.destroy();
  }

  async seedUsersIfNeeded() {
    const counter = await this.db
      .selectFrom("users")
      .select(({ fn }) => fn.countAll().as("count"))
      .executeTakeFirst();

    if (Number(counter?.count || 0) > 0) return;

    for (const seedUser of DEFAULT_USERS) {
      const user = normalizeUser({
        ...seedUser,
        password_hash: hashPassword(seedUser.password),
      });

      await this.db
        .insertInto("users")
        .values({
          id: user.id,
          username: user.username,
          email: user.email,
          password_hash: user.password_hash,
          role: user.role,
          display_name: user.display_name,
          created_at: user.created_at,
        })
        .onConflict((oc) => oc.column("id").doNothing())
        .execute();
    }
  }

  async reset() {
    await this.bootstrap();
    await this.db.deleteFrom("users").execute();
    await this.seedUsersIfNeeded();
  }

  async listUsers() {
    await this.bootstrap();
    const rows = await this.db
      .selectFrom("users")
      .selectAll()
      .orderBy("created_at", "asc")
      .execute();
    return rows.map((row) => normalizeUserRow(row));
  }

  async findUserById(userId) {
    await this.bootstrap();
    const normalized = toId(userId);
    if (!normalized) return null;

    const row = await this.db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", normalized)
      .executeTakeFirst();
    return row ? normalizeUserRow(row) : null;
  }

  async findUserByIdentifier(identifier) {
    await this.bootstrap();
    const normalized = toLookupKey(identifier);
    if (!normalized) return null;

    const row = await this.db
      .selectFrom("users")
      .selectAll()
      .where(
        sql`lower(email) = ${normalized} OR lower(username) = ${normalized}`,
      )
      .executeTakeFirst();

    return row ? normalizeUserRow(row) : null;
  }

  async usernameExists(username) {
    await this.bootstrap();
    const normalized = toLookupKey(username);
    if (!normalized) return false;

    const row = await this.db
      .selectFrom("users")
      .select("id")
      .where(sql`lower(username) = ${normalized}`)
      .limit(1)
      .executeTakeFirst();

    return Boolean(row);
  }

  async emailExists(email) {
    await this.bootstrap();
    const normalized = toLookupKey(email);
    if (!normalized) return false;

    const row = await this.db
      .selectFrom("users")
      .select("id")
      .where(sql`lower(email) = ${normalized}`)
      .limit(1)
      .executeTakeFirst();

    return Boolean(row);
  }

  async countAdmins() {
    await this.bootstrap();
    const counter = await this.db
      .selectFrom("users")
      .select(({ fn }) => fn.countAll().as("count"))
      .where("role", "=", "admin")
      .executeTakeFirst();

    return Number(counter?.count || 0);
  }

  async createUser({ username, email, password, role = "user" }) {
    await this.bootstrap();
    const user = normalizeUser({
      id: uid("user"),
      username,
      email,
      password_hash: hashPassword(password),
      role,
      display_name: username,
      created_at: nowIso(),
    });

    const row = await this.db
      .insertInto("users")
      .values({
        id: user.id,
        username: user.username,
        email: user.email,
        password_hash: user.password_hash,
        role: user.role,
        display_name: user.display_name,
        created_at: user.created_at,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return normalizeUserRow(row);
  }

  async deleteUser(userId) {
    await this.bootstrap();
    const normalized = toId(userId);
    if (!normalized) return false;

    const deleted = await this.db
      .deleteFrom("users")
      .where("id", "=", normalized)
      .returning("id")
      .executeTakeFirst();

    return Boolean(deleted);
  }

  async createSession(userId) {
    await this.bootstrap();
    await this.cleanupExpiredSessions();

    const normalizedUserId = toId(userId);
    const createdAtMs = Date.now();
    const token = sessionToken();
    const createdAt = new Date(createdAtMs).toISOString();
    const expiresAt = new Date(createdAtMs + SESSION_TTL_MS).toISOString();

    await this.db
      .insertInto("sessions")
      .values({
        token,
        user_id: normalizedUserId,
        created_at: createdAt,
        expires_at: expiresAt,
      })
      .execute();

    return {
      token,
      expires_at: expiresAt,
    };
  }

  async deleteSession(token) {
    await this.bootstrap();
    const normalized = toId(token);
    if (!normalized) return false;

    const deleted = await this.db
      .deleteFrom("sessions")
      .where("token", "=", normalized)
      .returning("token")
      .executeTakeFirst();

    return Boolean(deleted);
  }

  async revokeSession(token) {
    return this.deleteSession(token);
  }

  async revokeSessionsByUser(userId) {
    await this.bootstrap();
    const normalized = toId(userId);
    if (!normalized) return 0;

    const deleted = await this.db
      .deleteFrom("sessions")
      .where("user_id", "=", normalized)
      .returning("token")
      .execute();

    return deleted.length;
  }

  async cleanupExpiredSessions() {
    await this.bootstrap();
    const deleted = await this.db
      .deleteFrom("sessions")
      .where("expires_at", "<=", sql`now()`)
      .returning("token")
      .execute();

    return deleted.length;
  }

  async findSession(token) {
    await this.bootstrap();
    const normalized = toId(token);
    if (!normalized) return null;

    const row = await this.db
      .selectFrom("sessions")
      .selectAll()
      .where("token", "=", normalized)
      .executeTakeFirst();

    if (!row) return null;

    const session = normalizeSession(row);
    const expiresMs = new Date(session.expires_at).getTime();

    if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) {
      await this.deleteSession(normalized);
      return null;
    }

    return session;
  }

  async createSubmission({ user_id, problem_id, problem_title, language }) {
    await this.bootstrap();
    const timestamp = nowIso();
    const submission = {
      id: uid("sub"),
      user_id: toId(user_id),
      problem_id: toId(problem_id),
      problem_title: String(problem_title || ""),
      language: String(language || "python").toLowerCase(),
      code: "",
      stage_results: {},
      runtime_ms: 0,
      final_score: 0,
      verdict: "pending",
      events: [],
      created_at: timestamp,
      updated_at: timestamp,
      submitted_at: null,
    };

    const row = await this.db
      .insertInto("submissions")
      .values({
        id: submission.id,
        user_id: submission.user_id,
        problem_id: submission.problem_id,
        problem_title: submission.problem_title,
        language: submission.language,
        code: submission.code,
        stage_results: toJsonb(submission.stage_results, {}),
        runtime_ms: submission.runtime_ms,
        final_score: submission.final_score,
        verdict: submission.verdict,
        events: toJsonb(submission.events, []),
        created_at: submission.created_at,
        updated_at: submission.updated_at,
        submitted_at: submission.submitted_at,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return normalizeSubmission(row);
  }

  async findSubmission(submissionId) {
    await this.bootstrap();
    const normalized = toId(submissionId);
    if (!normalized) return null;

    const row = await this.db
      .selectFrom("submissions")
      .selectAll()
      .where("id", "=", normalized)
      .executeTakeFirst();

    return row ? normalizeSubmission(row) : null;
  }

  async findSubmissionByOwner(submissionId, userId) {
    await this.bootstrap();
    const normalizedSubmissionId = toId(submissionId);
    const normalizedUserId = toId(userId);
    if (!normalizedSubmissionId || !normalizedUserId) return null;

    const row = await this.db
      .selectFrom("submissions")
      .selectAll()
      .where("id", "=", normalizedSubmissionId)
      .where("user_id", "=", normalizedUserId)
      .executeTakeFirst();

    return row ? normalizeSubmission(row) : null;
  }

  async updateSubmission(submissionId, updates = {}) {
    await this.bootstrap();
    const normalizedSubmissionId = toId(submissionId);
    if (!normalizedSubmissionId) return null;

    const current = await this.findSubmission(normalizedSubmissionId);
    if (!current) return null;

    const merged = {
      ...current,
      ...updates,
      code: String(updates.code ?? current.code ?? ""),
      stage_results:
        updates.stage_results && typeof updates.stage_results === "object"
          ? updates.stage_results
          : current.stage_results,
      runtime_ms: Number(updates.runtime_ms ?? current.runtime_ms ?? 0),
      final_score: Number(updates.final_score ?? current.final_score ?? 0),
      verdict: String(updates.verdict ?? current.verdict ?? "pending"),
      events: Array.isArray(updates.events) ? updates.events : current.events,
      updated_at: String(updates.updated_at || nowIso()),
      submitted_at: updates.submitted_at ?? current.submitted_at,
    };

    const row = await this.db
      .updateTable("submissions")
      .set({
        code: merged.code,
        stage_results: toJsonb(merged.stage_results, {}),
        runtime_ms: merged.runtime_ms,
        final_score: merged.final_score,
        verdict: merged.verdict,
        events: toJsonb(merged.events, []),
        updated_at: merged.updated_at,
        submitted_at: merged.submitted_at,
      })
      .where("id", "=", normalizedSubmissionId)
      .returningAll()
      .executeTakeFirst();

    return row ? normalizeSubmission(row) : null;
  }

  async listSubmissions() {
    await this.bootstrap();
    const rows = await this.db
      .selectFrom("submissions")
      .selectAll()
      .orderBy("created_at", "asc")
      .execute();
    return rows.map((row) => normalizeSubmission(row));
  }

  async listSubmissionsByUser(userId) {
    await this.bootstrap();
    const normalized = toId(userId);
    if (!normalized) return [];

    const rows = await this.db
      .selectFrom("submissions")
      .selectAll()
      .where("user_id", "=", normalized)
      .orderBy("created_at", "asc")
      .execute();

    return rows.map((row) => normalizeSubmission(row));
  }

  async deleteSubmissionsByUser(userId) {
    await this.bootstrap();
    const normalized = toId(userId);
    if (!normalized) return 0;

    const deleted = await this.db
      .deleteFrom("submissions")
      .where("user_id", "=", normalized)
      .returning("id")
      .execute();

    return deleted.length;
  }
}

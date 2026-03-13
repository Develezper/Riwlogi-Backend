import { sql } from "kysely";
import { logger } from "../../config/logger.js";
import { createPostgresDb } from "../db/client.js";
import { runMigrations } from "../db/migrator.js";
import { HttpError } from "../../utils/http-error.js";
import { nowIso } from "../../utils/time.js";
import { loadCatalog, sortProblems } from "./loaders.js";
import { cleanString, isValidProblem, normalizeProblem } from "./normalizers.js";

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

function toJsonb(value, fallback) {
  const resolved = value ?? fallback;
  try {
    return JSON.stringify(resolved);
  } catch {
    return JSON.stringify(fallback);
  }
}

function rowToProblem(row) {
  return normalizeProblem({
    id: row.id,
    slug: row.slug,
    title: row.title,
    difficulty: row.difficulty,
    tags: parseJson(row.tags, []),
    acceptance: row.acceptance,
    submissions: row.submissions,
    description: row.description,
    examples: parseJson(row.examples, []),
    constraints: parseJson(row.constraints, []),
    statement_md: row.statement_md,
    starter_code: parseJson(row.starter_code, {}),
    stages: parseJson(row.stages, []),
    stages_count: row.stages_count,
    status: row.status,
    source: row.source,
    last_generated_prompt: row.last_generated_prompt,
    created_at: asIso(row.created_at),
    updated_at: asIso(row.updated_at),
  });
}

function toInsertRow(problem) {
  return {
    id: problem.id,
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    tags: toJsonb(problem.tags, []),
    acceptance: Number(problem.acceptance || 0),
    submissions: Number(problem.submissions || 0),
    description: problem.description || null,
    examples: toJsonb(problem.examples || [], []),
    constraints: toJsonb(problem.constraints || [], []),
    statement_md: problem.statement_md,
    starter_code: toJsonb(problem.starter_code || {}, {}),
    stages: toJsonb(problem.stages || [], []),
    stages_count: 1,
    status: problem.status,
    source: problem.source,
    last_generated_prompt: problem.last_generated_prompt || "",
    created_at: problem.created_at,
    updated_at: problem.updated_at,
  };
}

function toNeedle(value) {
  return cleanString(value).toLowerCase();
}

class PostgresProblemCatalog {
  constructor() {
    const { db, pool } = createPostgresDb();
    this.db = db;
    this.pool = pool;
    this.readyPromise = null;
  }

  async ensureReady() {
    if (!this.readyPromise) {
      this.readyPromise = this.initialize();
    }

    await this.readyPromise;
  }

  async initialize() {
    await runMigrations(this.db, logger);
    await this.seedIfNeeded();
  }

  async seedIfNeeded() {
    const counter = await this.db
      .selectFrom("problems")
      .select(({ fn }) => fn.countAll().as("count"))
      .executeTakeFirst();

    if (Number(counter?.count || 0) > 0) return;

    const seedProblems = loadCatalog();
    if (!Array.isArray(seedProblems) || !seedProblems.length) return;

    for (const rawProblem of seedProblems) {
      const problem = normalizeProblem(rawProblem, {
        source: cleanString(rawProblem?.source || "seed") || "seed",
      });

      if (!isValidProblem(problem)) continue;

      await this.db
        .insertInto("problems")
        .values(toInsertRow(problem))
        .onConflict((oc) => oc.column("id").doNothing())
        .execute();
    }
  }

  async getAllProblems() {
    await this.ensureReady();

    const rows = await this.db
      .selectFrom("problems")
      .selectAll()
      .orderBy("difficulty", "asc")
      .orderBy(sql`lower(title)`, "asc")
      .orderBy("id", "asc")
      .execute();

    return sortProblems(rows.map(rowToProblem));
  }

  async getProblemBySlug(problemIdOrSlug) {
    await this.ensureReady();

    const needle = toNeedle(problemIdOrSlug);
    if (!needle) return null;

    const row = await this.db
      .selectFrom("problems")
      .selectAll()
      .where(sql`lower(id) = ${needle} OR lower(slug) = ${needle}`)
      .executeTakeFirst();

    return row ? rowToProblem(row) : null;
  }

  async getAllTags() {
    const problems = await this.getAllProblems();
    return [...new Set(problems.flatMap((problem) => problem.tags || []))].sort((a, b) =>
      String(a).localeCompare(String(b)),
    );
  }

  async createProblem(problemInput) {
    await this.ensureReady();

    const problem = normalizeProblem(problemInput, {
      source: cleanString(problemInput?.source || "custom") || "custom",
    });

    if (!isValidProblem(problem)) {
      throw new HttpError(400, "Problema invalido.");
    }

    const collision = await this.db
      .selectFrom("problems")
      .select("id")
      .where(sql`lower(id) = ${toNeedle(problem.id)} OR lower(slug) = ${toNeedle(problem.slug)}`)
      .executeTakeFirst();

    if (collision) {
      throw new HttpError(409, "Ya existe un problema con ese id o slug.");
    }

    const inserted = await this.db
      .insertInto("problems")
      .values(toInsertRow(problem))
      .returningAll()
      .executeTakeFirstOrThrow();

    return rowToProblem(inserted);
  }

  async updateProblem(problemIdOrSlug, updates = {}) {
    await this.ensureReady();

    const needle = toNeedle(problemIdOrSlug);
    if (!needle) {
      throw new HttpError(404, "Problema no encontrado.");
    }

    const currentRow = await this.db
      .selectFrom("problems")
      .selectAll()
      .where(sql`lower(id) = ${needle} OR lower(slug) = ${needle}`)
      .executeTakeFirst();

    if (!currentRow) {
      throw new HttpError(404, "Problema no encontrado.");
    }

    const current = rowToProblem(currentRow);
    const requestedSlug = cleanString(updates.slug || current.slug);

    if (requestedSlug.toLowerCase() !== current.slug.toLowerCase()) {
      const slugCollision = await this.db
        .selectFrom("problems")
        .select("id")
        .where(sql`lower(slug) = ${requestedSlug.toLowerCase()}`)
        .executeTakeFirst();

      if (slugCollision) {
        throw new HttpError(409, "El slug ya esta en uso.");
      }
    }

    const merged = normalizeProblem(
      {
        ...current,
        ...updates,
        id: current.id,
        slug: requestedSlug,
        created_at: current.created_at,
      },
      {
        source: cleanString(updates.source || current.source || "custom"),
      },
    );

    if (!isValidProblem(merged)) {
      throw new HttpError(400, "Actualizacion invalida del problema.");
    }

    const updated = await this.db
      .updateTable("problems")
      .set({
        slug: merged.slug,
        title: merged.title,
        difficulty: merged.difficulty,
        tags: toJsonb(merged.tags, []),
        acceptance: Number(merged.acceptance || 0),
        submissions: Number(merged.submissions || 0),
        description: merged.description || null,
        examples: toJsonb(merged.examples || [], []),
        constraints: toJsonb(merged.constraints || [], []),
        statement_md: merged.statement_md,
        starter_code: toJsonb(merged.starter_code || {}, {}),
        stages: toJsonb(merged.stages || [], []),
        stages_count: 1,
        status: merged.status,
        source: merged.source,
        last_generated_prompt: merged.last_generated_prompt || "",
        updated_at: merged.updated_at,
      })
      .where("id", "=", current.id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return rowToProblem(updated);
  }

  async deleteProblem(problemIdOrSlug) {
    await this.ensureReady();

    const needle = toNeedle(problemIdOrSlug);
    if (!needle) {
      throw new HttpError(404, "Problema no encontrado.");
    }

    const deleted = await this.db
      .deleteFrom("problems")
      .where(sql`lower(id) = ${needle} OR lower(slug) = ${needle}`)
      .returningAll()
      .executeTakeFirst();

    if (!deleted) {
      throw new HttpError(404, "Problema no encontrado.");
    }

    return rowToProblem(deleted);
  }

  async resetProblemCatalog() {
    await this.ensureReady();
    await this.db.deleteFrom("problems").execute();
    await this.seedIfNeeded();
    return this.getAllProblems();
  }
}

export const postgresProblemCatalog = new PostgresProblemCatalog();

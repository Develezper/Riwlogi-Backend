import { getAllProblems, getAllTags, getProblemBySlug } from "../../data/problem-catalog.js";
import { HttpError } from "../../utils/http-error.js";
import { z } from "zod";

const listProblemsInputSchema = z.any().transform((value) => {
  const input = value && typeof value === "object" ? value : {};
  const parsedDifficulty = Number(input.difficulty);

  return {
    difficulty: Number.isFinite(parsedDifficulty) && parsedDifficulty > 0 ? parsedDifficulty : null,
    search: String(input.search || "").trim().toLowerCase(),
    tag: String(input.tag || "").trim().toLowerCase(),
  };
});

const problemSlugSchema = z.any().transform((value) => String(value || "").trim());

function toProblemSummary(problem) {
  return {
    id: problem.id,
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    tags: problem.tags,
    acceptance: problem.acceptance,
    submissions: problem.submissions,
    stages_count: problem.stages_count,
  };
}

function toPublicStage(stage) {
  return {
    id: stage.id,
    stage_index: stage.stage_index,
    prompt_md: stage.prompt_md,
    time_limit_ms: stage.time_limit_ms,
    hidden_count: stage.hidden_count,
    visible_tests: Array.isArray(stage.visible_tests) ? stage.visible_tests : [],
  };
}

function toProblemDetail(problem) {
  return {
    ...toProblemSummary(problem),
    statement_md: problem.statement_md,
    starter_code: problem.starter_code,
    stages: (Array.isArray(problem.stages) ? problem.stages : []).map(toPublicStage),
  };
}

export function listProblems({ difficulty, search, tag } = {}) {
  const { difficulty: parsedDifficulty, search: normalizedSearch, tag: normalizedTag } =
    listProblemsInputSchema.parse({
      difficulty,
      search,
      tag,
    });

  return getAllProblems()
    .filter((problem) => {
      const difficultyMatches = !parsedDifficulty || problem.difficulty === parsedDifficulty;
      const searchMatches = !normalizedSearch || problem.title.toLowerCase().includes(normalizedSearch);
      const tagMatches = !normalizedTag || problem.tags.some((item) => item.toLowerCase() === normalizedTag);

      return difficultyMatches && searchMatches && tagMatches;
    })
    .map(toProblemSummary);
}

export function getProblem(slug) {
  const problem = getProblemBySlug(problemSlugSchema.parse(slug));
  if (!problem) {
    throw new HttpError(404, "Problema no encontrado.");
  }

  return toProblemDetail(problem);
}

export function listTags() {
  return getAllTags();
}

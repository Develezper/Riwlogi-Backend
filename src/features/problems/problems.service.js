import { getAllProblems, getProblemBySlug } from "../../data/problem-catalog.js";
import { HttpError } from "../../utils/http-error.js";

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function canonicalStatus(value) {
  const status = normalizeStatus(value);
  if (status === "publicado") return "published";
  if (status === "borrador") return "draft";
  if (status === "archivado") return "archived";
  if (status === "pendiente") return "pending";
  return status;
}

function isPublishedStatus(value) {
  return canonicalStatus(value) === "published";
}

function toProblemSummary(problem) {
  return {
    id: problem.id,
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    tags: problem.tags,
    acceptance: problem.acceptance,
    submissions: problem.submissions,
    status: canonicalStatus(problem.status),
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

function toPublicProblem(problem) {
  return {
    ...problem,
    stages: Array.isArray(problem.stages) ? problem.stages.map(toPublicStage) : [],
  };
}

export async function listProblems({ difficulty, search, tag, status } = {}) {
  const parsedDifficulty = difficulty ? Number(difficulty) : null;
  const normalizedSearch = String(search || "").trim().toLowerCase();
  const normalizedTag = String(tag || "").trim().toLowerCase();
  const normalizedStatus = canonicalStatus(status);

  if (normalizedStatus && !isPublishedStatus(normalizedStatus)) {
    return [];
  }

  const problems = await getAllProblems();

  return problems
    .filter((problem) => {
      const statusMatches = normalizedStatus
        ? canonicalStatus(problem.status) === normalizedStatus
        : isPublishedStatus(problem.status);
      const difficultyMatches = !parsedDifficulty || problem.difficulty === parsedDifficulty;
      const searchMatches = !normalizedSearch || problem.title.toLowerCase().includes(normalizedSearch);
      const tagMatches = !normalizedTag || problem.tags.some((item) => item.toLowerCase() === normalizedTag);

      return statusMatches && difficultyMatches && searchMatches && tagMatches;
    })
    .map(toProblemSummary);
}

export async function getProblem(slug) {
  const problem = await getProblemBySlug(slug);
  if (!problem) {
    throw new HttpError(404, "Problema no encontrado.");
  }

  if (!isPublishedStatus(problem.status)) {
    throw new HttpError(404, "Problema no encontrado.");
  }

  return toPublicProblem(problem);
}

export async function listTags() {
  const problems = await getAllProblems();
  return [...new Set(
    problems
      .filter((problem) => isPublishedStatus(problem.status))
      .flatMap((problem) => problem.tags || []),
  )].sort((a, b) => String(a).localeCompare(String(b)));
}

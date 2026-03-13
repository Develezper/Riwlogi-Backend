import { getAllProblems, getAllTags, getProblemBySlug } from "../../data/problem-catalog.js";
import { HttpError } from "../../utils/http-error.js";

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

function toPublicProblem(problem) {
  return {
    ...problem,
    stages: Array.isArray(problem.stages) ? problem.stages.map(toPublicStage) : [],
  };
}

export async function listProblems({ difficulty, search, tag } = {}) {
  const parsedDifficulty = difficulty ? Number(difficulty) : null;
  const normalizedSearch = String(search || "").trim().toLowerCase();
  const normalizedTag = String(tag || "").trim().toLowerCase();
  const problems = await getAllProblems();

  return problems
    .filter((problem) => {
      const difficultyMatches = !parsedDifficulty || problem.difficulty === parsedDifficulty;
      const searchMatches = !normalizedSearch || problem.title.toLowerCase().includes(normalizedSearch);
      const tagMatches = !normalizedTag || problem.tags.some((item) => item.toLowerCase() === normalizedTag);

      return difficultyMatches && searchMatches && tagMatches;
    })
    .map(toProblemSummary);
}

export async function getProblem(slug) {
  const problem = await getProblemBySlug(slug);
  if (!problem) {
    throw new HttpError(404, "Problema no encontrado.");
  }

  return toPublicProblem(problem);
}

export async function listTags() {
  return await getAllTags();
}

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

export function listProblems({ difficulty, search, tag } = {}) {
  const parsedDifficulty = difficulty ? Number(difficulty) : null;
  const normalizedSearch = String(search || "").trim().toLowerCase();
  const normalizedTag = String(tag || "").trim().toLowerCase();

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
  const problem = getProblemBySlug(slug);
  if (!problem) {
    throw new HttpError(404, "Problema no encontrado.");
  }

  return problem;
}

export function listTags() {
  return getAllTags();
}

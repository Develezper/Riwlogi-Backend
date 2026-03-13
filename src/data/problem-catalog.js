import { env } from "../config/env.js";
import {
  createProblem as createProblemInMemory,
  deleteProblem as deleteProblemInMemory,
  getAllProblems as getAllProblemsInMemory,
  getAllTags as getAllTagsInMemory,
  getProblemBySlug as getProblemBySlugInMemory,
  resetProblemCatalog as resetProblemCatalogInMemory,
  updateProblem as updateProblemInMemory,
} from "./problem-catalog/state.js";
import { postgresProblemCatalog } from "./problem-catalog/postgres-state.js";

const usesPostgresCatalog = env.STORE_PROVIDER === "postgres";

export async function createProblem(problemInput) {
  if (usesPostgresCatalog) return postgresProblemCatalog.createProblem(problemInput);
  return createProblemInMemory(problemInput);
}

export async function deleteProblem(problemIdOrSlug) {
  if (usesPostgresCatalog) return postgresProblemCatalog.deleteProblem(problemIdOrSlug);
  return deleteProblemInMemory(problemIdOrSlug);
}

export async function getAllProblems() {
  if (usesPostgresCatalog) return postgresProblemCatalog.getAllProblems();
  return getAllProblemsInMemory();
}

export async function getAllTags() {
  if (usesPostgresCatalog) return postgresProblemCatalog.getAllTags();
  return getAllTagsInMemory();
}

export async function getProblemBySlug(problemIdOrSlug) {
  if (usesPostgresCatalog) return postgresProblemCatalog.getProblemBySlug(problemIdOrSlug);
  return getProblemBySlugInMemory(problemIdOrSlug);
}

export async function resetProblemCatalog() {
  if (usesPostgresCatalog) return postgresProblemCatalog.resetProblemCatalog();
  return resetProblemCatalogInMemory();
}

export async function updateProblem(problemIdOrSlug, updates = {}) {
  if (usesPostgresCatalog) return postgresProblemCatalog.updateProblem(problemIdOrSlug, updates);
  return updateProblemInMemory(problemIdOrSlug, updates);
}

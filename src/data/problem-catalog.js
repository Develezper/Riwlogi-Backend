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

let postgresCatalogPromise = null;

function shouldUsePostgresCatalog() {
  return env.STORE_PROVIDER === "postgres";
}

async function getPostgresProblemCatalog() {
  if (!postgresCatalogPromise) {
    postgresCatalogPromise = import("./problem-catalog/postgres-state.js").then(
      (module) => module.postgresProblemCatalog,
    );
  }

  return postgresCatalogPromise;
}

export async function createProblem(problemInput) {
  if (shouldUsePostgresCatalog()) {
    const postgresProblemCatalog = await getPostgresProblemCatalog();
    return postgresProblemCatalog.createProblem(problemInput);
  }

  return createProblemInMemory(problemInput);
}

export async function deleteProblem(problemIdOrSlug) {
  if (shouldUsePostgresCatalog()) {
    const postgresProblemCatalog = await getPostgresProblemCatalog();
    return postgresProblemCatalog.deleteProblem(problemIdOrSlug);
  }

  return deleteProblemInMemory(problemIdOrSlug);
}

export async function getAllProblems() {
  if (shouldUsePostgresCatalog()) {
    const postgresProblemCatalog = await getPostgresProblemCatalog();
    return postgresProblemCatalog.getAllProblems();
  }

  return getAllProblemsInMemory();
}

export async function getAllTags() {
  if (shouldUsePostgresCatalog()) {
    const postgresProblemCatalog = await getPostgresProblemCatalog();
    return postgresProblemCatalog.getAllTags();
  }

  return getAllTagsInMemory();
}

export async function getProblemBySlug(problemIdOrSlug) {
  if (shouldUsePostgresCatalog()) {
    const postgresProblemCatalog = await getPostgresProblemCatalog();
    return postgresProblemCatalog.getProblemBySlug(problemIdOrSlug);
  }

  return getProblemBySlugInMemory(problemIdOrSlug);
}

export async function resetProblemCatalog() {
  if (shouldUsePostgresCatalog()) {
    const postgresProblemCatalog = await getPostgresProblemCatalog();
    return postgresProblemCatalog.resetProblemCatalog();
  }

  return resetProblemCatalogInMemory();
}

export async function updateProblem(problemIdOrSlug, updates = {}) {
  if (shouldUsePostgresCatalog()) {
    const postgresProblemCatalog = await getPostgresProblemCatalog();
    return postgresProblemCatalog.updateProblem(problemIdOrSlug, updates);
  }

  return updateProblemInMemory(problemIdOrSlug, updates);
}

import { HttpError } from "../../utils/http-error.js";
import { nowIso } from "../../utils/time.js";
import { loadCatalog, sortProblems } from "./loaders.js";
import { cleanString, isValidProblem, normalizeProblem } from "./normalizers.js";

let catalog = loadCatalog();

function findProblemIndex(problemIdOrSlug) {
  const needle = cleanString(problemIdOrSlug).toLowerCase();
  if (!needle) return -1;

  return catalog.findIndex(
    (problem) => problem.id.toLowerCase() === needle || problem.slug.toLowerCase() === needle,
  );
}

export function getAllProblems() {
  return catalog.slice();
}

export function getProblemBySlug(slug) {
  const index = findProblemIndex(slug);
  if (index < 0) return null;
  return catalog[index];
}

export function getAllTags() {
  return [...new Set(catalog.flatMap((problem) => problem.tags))].sort((a, b) => a.localeCompare(b));
}

export function createProblem(problemInput) {
  const problem = normalizeProblem(problemInput, {
    source: cleanString(problemInput?.source || "custom") || "custom",
  });

  if (!isValidProblem(problem)) {
    throw new HttpError(400, "Problema invalido.");
  }

  if (findProblemIndex(problem.id) >= 0 || findProblemIndex(problem.slug) >= 0) {
    throw new HttpError(409, "Ya existe un problema con ese id o slug.");
  }

  catalog.push(problem);
  catalog = sortProblems(catalog);
  return problem;
}

export function updateProblem(problemIdOrSlug, updates = {}) {
  const index = findProblemIndex(problemIdOrSlug);
  if (index < 0) {
    throw new HttpError(404, "Problema no encontrado.");
  }

  const current = catalog[index];
  const requestedSlug = cleanString(updates.slug || current.slug);

  const slugCollisionIndex =
    requestedSlug.toLowerCase() === current.slug.toLowerCase() ? -1 : findProblemIndex(requestedSlug);

  if (slugCollisionIndex >= 0) {
    throw new HttpError(409, "El slug ya esta en uso.");
  }

  const merged = normalizeProblem(
    {
      ...current,
      ...updates,
      id: current.id,
      slug: requestedSlug,
      created_at: current.created_at,
      updated_at: nowIso(),
    },
    {
      source: cleanString(updates.source || current.source || "custom"),
    },
  );

  if (!isValidProblem(merged)) {
    throw new HttpError(400, "Actualizacion invalida del problema.");
  }

  catalog[index] = merged;
  catalog = sortProblems(catalog);
  return merged;
}

export function deleteProblem(problemIdOrSlug) {
  const index = findProblemIndex(problemIdOrSlug);
  if (index < 0) {
    throw new HttpError(404, "Problema no encontrado.");
  }

  const [removed] = catalog.splice(index, 1);
  return removed;
}

export function resetProblemCatalog() {
  catalog = loadCatalog();
  return getAllProblems();
}

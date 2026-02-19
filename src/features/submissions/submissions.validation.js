import { HttpError } from "../../utils/http-error.js";

export const ALLOWED_LANGUAGES = new Set(["python", "javascript", "typescript"]);

export function normalizeProblemId(problemId) {
  const normalized = String(problemId || "").trim();
  if (!normalized) {
    throw new HttpError(400, "Debes indicar el problem_id.");
  }
  return normalized;
}

export function normalizeSubmissionId(submissionId) {
  const normalized = String(submissionId || "").trim();
  if (!normalized) {
    throw new HttpError(400, "Debes indicar la submission_id.");
  }
  return normalized;
}

export function normalizeStageId(stageId) {
  const normalized = String(stageId || "").trim();
  if (!normalized) {
    throw new HttpError(400, "Debes indicar el stage_id.");
  }
  return normalized;
}

export function normalizeLanguage(language) {
  const normalized = String(language || "").trim().toLowerCase();
  if (!ALLOWED_LANGUAGES.has(normalized)) {
    throw new HttpError(400, "Lenguaje inválido.");
  }
  return normalized;
}

export function validateLanguageCode(code, language) {
  const normalizedCode = String(code || "").trim();
  if (!normalizedCode) {
    throw new HttpError(400, "El código no puede estar vacío.");
  }

  const normalizedLanguage = normalizeLanguage(language);
  return {
    code: normalizedCode,
    language: normalizedLanguage,
  };
}

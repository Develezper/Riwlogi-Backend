import { z } from "zod";
import { parseOrBadRequest } from "../../utils/zod.js";

export const ALLOWED_LANGUAGES = new Set(["python", "javascript", "typescript"]);

function requiredTrimmedString(message) {
  return z
    .any()
    .transform((value) => String(value || "").trim())
    .refine(Boolean, { message });
}

const problemIdSchema = requiredTrimmedString("Debes indicar el problem_id.");
const submissionIdSchema = requiredTrimmedString("Debes indicar la submission_id.");
const stageIdSchema = requiredTrimmedString("Debes indicar el stage_id.");

const languageSchema = requiredTrimmedString("Lenguaje inválido.")
  .transform((value) => value.toLowerCase())
  .refine((value) => ALLOWED_LANGUAGES.has(value), {
    message: "Lenguaje inválido.",
  });

const nonEmptyCodeSchema = requiredTrimmedString("El código no puede estar vacío.");

export function normalizeProblemId(problemId) {
  return parseOrBadRequest(problemIdSchema, problemId, "Debes indicar el problem_id.");
}

export function normalizeSubmissionId(submissionId) {
  return parseOrBadRequest(submissionIdSchema, submissionId, "Debes indicar la submission_id.");
}

export function normalizeStageId(stageId) {
  return parseOrBadRequest(stageIdSchema, stageId, "Debes indicar el stage_id.");
}

export function normalizeLanguage(language) {
  return parseOrBadRequest(languageSchema, language, "Lenguaje inválido.");
}

export function validateLanguageCode(code, language) {
  const normalizedCode = parseOrBadRequest(nonEmptyCodeSchema, code, "El código no puede estar vacío.");
  const normalizedLanguage = normalizeLanguage(language);
  return {
    code: normalizedCode,
    language: normalizedLanguage,
  };
}

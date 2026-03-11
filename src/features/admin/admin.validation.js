import { HttpError } from "../../utils/http-error.js";
import { z } from "zod";
import { parseOrBadRequest } from "../../utils/zod.js";

const PROBLEM_UPDATE_FIELDS = [
  "slug",
  "title",
  "difficulty",
  "tags",
  "acceptance",
  "submissions",
  "description",
  "examples",
  "constraints",
  "statement_md",
  "starter_code",
  "stages",
  "stages_count",
  "status",
  "source",
  "last_generated_prompt",
];

const problemUpdatesSchema = z.object(
  Object.fromEntries(PROBLEM_UPDATE_FIELDS.map((key) => [key, z.any().optional()])),
);

const generationPromptSchema = z
  .any()
  .transform((value) => String(value || "").trim())
  .refine((value) => value.length >= 10, {
    message: "El prompt debe tener al menos 10 caracteres.",
  });

export function sanitizeProblemUpdates(updates) {
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    throw new HttpError(400, "Body invalido para actualizar el problema.");
  }

  const sanitized = parseOrBadRequest(
    problemUpdatesSchema,
    updates,
    "Body invalido para actualizar el problema.",
  );

  if (Object.keys(sanitized).length === 0) {
    throw new HttpError(400, "No se enviaron campos actualizables.");
  }

  return sanitized;
}

export function normalizeGenerationPrompt(prompt) {
  return parseOrBadRequest(
    generationPromptSchema,
    prompt,
    "El prompt debe tener al menos 10 caracteres.",
  );
}

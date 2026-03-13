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
  "stages_json",
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

function normalizeSingleStage(rawStages) {
  const source = Array.isArray(rawStages) ? rawStages : [];
  const stage = source[0] && typeof source[0] === "object" ? source[0] : {};

  const hiddenCount = Number.isFinite(Number(stage.hidden_count))
    ? Math.max(0, Math.min(2000, Number(stage.hidden_count)))
    : 0;

  const visibleTests = Array.isArray(stage.visible_tests)
    ? stage.visible_tests
        .map((test) => ({
          input_text: String(test?.input_text || "").trim(),
          expected_text: String(test?.expected_text || "").trim(),
        }))
        .filter((test) => test.input_text || test.expected_text)
    : [];

  return [
    {
      stage_index: 1,
      prompt_md: String(stage.prompt_md || "").trim(),
      hidden_count: hiddenCount,
      visible_tests: visibleTests,
    },
  ];
}

function parseStagesJson(value) {
  if (Array.isArray(value)) return normalizeSingleStage(value);

  const raw = String(value ?? "").trim();
  if (!raw) {
    throw new HttpError(400, "El campo stages_json no puede estar vacio.");
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new HttpError(400, "El campo stages_json debe ser un arreglo JSON.");
    }
    return normalizeSingleStage(parsed);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "El campo stages_json debe ser JSON valido.");
  }
}

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

  if (Object.prototype.hasOwnProperty.call(sanitized, "stages_json")) {
    sanitized.stages = parseStagesJson(sanitized.stages_json);
    delete sanitized.stages_json;
  } else if (Object.prototype.hasOwnProperty.call(sanitized, "stages")) {
    sanitized.stages = normalizeSingleStage(sanitized.stages);
  }

  if (Object.prototype.hasOwnProperty.call(sanitized, "stages") || Object.prototype.hasOwnProperty.call(sanitized, "stages_count")) {
    sanitized.stages_count = 1;
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

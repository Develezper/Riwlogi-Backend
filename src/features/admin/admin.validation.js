import { HttpError } from "../../utils/http-error.js";

export function sanitizeProblemUpdates(updates) {
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    throw new HttpError(400, "Body invalido para actualizar el problema.");
  }

  const allowed = [
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

  const sanitized = {};
  allowed.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      sanitized[key] = updates[key];
    }
  });

  if (Object.keys(sanitized).length === 0) {
    throw new HttpError(400, "No se enviaron campos actualizables.");
  }

  return sanitized;
}

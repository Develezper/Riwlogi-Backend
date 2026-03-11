import { HttpError } from "./http-error.js";

export function parseOrBadRequest(schema, input, fallbackMessage = "Datos inválidos.") {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }

  const firstIssue = result.error.issues[0];
  const message =
    typeof firstIssue?.message === "string" && firstIssue.message.trim()
      ? firstIssue.message
      : fallbackMessage;

  throw new HttpError(400, message);
}

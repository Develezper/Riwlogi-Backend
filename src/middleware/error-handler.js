import { HttpError } from "../utils/http-error.js";
import { env } from "../config/env.js";

export function errorHandler(error, req, res, _next) {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      message: error.message,
      ...(error.details ? { detail: error.details } : {}),
    });
    return;
  }

  console.error(`[${req?.context?.requestId || "unknown"}]`, error);

  res.status(500).json({
    message: "Error interno del servidor.",
    ...(env.NODE_ENV !== "production" && error instanceof Error
      ? { detail: error.message }
      : {}),
  });
}

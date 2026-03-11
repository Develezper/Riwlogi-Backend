import { HttpError } from "../utils/http-error.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export function errorHandler(error, req, res, _next) {
  const requestId = req?.id || "unknown";

  if (error instanceof HttpError) {
    req?.log?.warn(
      {
        request_id: requestId,
        status_code: error.status,
        message: error.message,
      },
      "Request failed with HttpError",
    );

    res.status(error.status).json({
      message: error.message,
      ...(error.details ? { detail: error.details } : {}),
    });
    return;
  }

  const targetLogger = req?.log || logger;
  targetLogger.error(
    {
      request_id: requestId,
      err: error,
    },
    "Unhandled server error",
  );

  res.status(500).json({
    message: "Error interno del servidor.",
    ...(env.NODE_ENV !== "production" && error instanceof Error
      ? { detail: error.message }
      : {}),
  });
}

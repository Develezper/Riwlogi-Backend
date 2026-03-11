import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./env.js";

export const helmetMiddleware = helmet();

function buildRateLimitMessage(message) {
  return {
    message,
  };
}

function createRateLimiter({ windowMs, limit, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    message: buildRateLimitMessage(message),
  });
}

export const authRateLimiter = createRateLimiter({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  message: "Demasiados intentos de autenticación. Intenta nuevamente más tarde.",
  skipSuccessfulRequests: true,
});

export const submissionsRateLimiter = createRateLimiter({
  windowMs: env.SUBMISSIONS_RATE_LIMIT_WINDOW_MS,
  limit: env.SUBMISSIONS_RATE_LIMIT_MAX,
  message: "Demasiadas solicitudes sobre submissions. Intenta nuevamente más tarde.",
});

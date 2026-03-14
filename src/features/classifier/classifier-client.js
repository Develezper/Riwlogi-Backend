import { env } from "../../config/env.js";
import { httpClient } from "../../config/http-client.js";
import { logger } from "../../config/logger.js";

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set([
  "ECONNABORTED",
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "ENOTFOUND",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateRetryDelay(attempt) {
  const base = env.CLASSIFIER_API_RETRY_DELAY_MS;
  const computed = Math.round(
    base * env.CLASSIFIER_API_RETRY_BACKOFF ** Math.max(0, attempt - 1),
  );
  return Math.min(
    env.CLASSIFIER_API_RETRY_MAX_DELAY_MS,
    Math.max(base, computed),
  );
}

function parseStatus(response) {
  return Number(response?.status || 0);
}

function shouldRetryResponse(response) {
  const status = parseStatus(response);
  return RETRYABLE_STATUS_CODES.has(status);
}

function shouldRetryError(error) {
  const code = String(error?.code || "")
    .trim()
    .toUpperCase();
  if (RETRYABLE_ERROR_CODES.has(code)) return true;

  const status = Number(error?.response?.status || 0);
  if (RETRYABLE_STATUS_CODES.has(status)) return true;

  const message = String(error?.message || "").toLowerCase();
  if (message.includes("timeout") || message.includes("socket hang up"))
    return true;

  return false;
}

function buildRetryContext({
  operationName,
  attempt,
  maxRetries,
  elapsedMs,
  delayMs,
  status,
  error,
}) {
  const retriesUsed = attempt - 1;
  return {
    operation: operationName,
    attempt,
    retries_remaining: Math.max(0, maxRetries - retriesUsed),
    elapsed_ms: elapsedMs,
    delay_ms: delayMs,
    ...(status ? { status_code: status } : {}),
    ...(error ? { err: error } : {}),
  };
}

export function trimTrailingSlash(value) {
  const text = String(value || "").trim();
  return text.endsWith("/") ? text.slice(0, -1) : text;
}

export function buildClassifierUrl(pathWithQuery) {
  const baseUrl = trimTrailingSlash(env.CLASSIFIER_API_BASE);
  if (!baseUrl) return "";

  const normalizedPath = String(pathWithQuery || "").startsWith("/")
    ? String(pathWithQuery)
    : `/${String(pathWithQuery || "")}`;

  return `${baseUrl}${normalizedPath}`;
}

export async function requestClassifierApi({
  operationName = "classifier_api",
  method,
  path,
  url,
  data,
  headers,
  timeout,
  validateStatus,
}) {
  const requestUrl = url || buildClassifierUrl(path);
  if (!requestUrl) {
    const error = new Error("CLASSIFIER_API_BASE is not configured.");
    error.code = "CLASSIFIER_NOT_CONFIGURED";
    throw error;
  }

  const maxRetries = env.CLASSIFIER_API_MAX_RETRIES;
  const startedAt = Date.now();
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt += 1;

    try {
      const response = await httpClient.request({
        method,
        url: requestUrl,
        data,
        headers,
        timeout: timeout ?? env.CLASSIFIER_API_TIMEOUT_MS,
        validateStatus: validateStatus || (() => true),
      });

      const retryableResponse = shouldRetryResponse(response);
      const hasRetryBudget = attempt <= maxRetries;
      const elapsedMs = Date.now() - startedAt;

      if (
        retryableResponse &&
        hasRetryBudget &&
        elapsedMs < env.CLASSIFIER_API_RETRY_MAX_ELAPSED_MS
      ) {
        const delayMs = calculateRetryDelay(attempt);

        logger.warn(
          buildRetryContext({
            operationName,
            attempt,
            maxRetries,
            elapsedMs,
            delayMs,
            status: parseStatus(response),
          }),
          "Classifier API retry after upstream transient status",
        );

        await sleep(delayMs);
        continue;
      }

      return response;
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      const isRetryable = shouldRetryError(error);
      const hasRetryBudget = attempt <= maxRetries;

      if (
        !isRetryable ||
        !hasRetryBudget ||
        elapsedMs >= env.CLASSIFIER_API_RETRY_MAX_ELAPSED_MS
      ) {
        throw error;
      }

      const delayMs = calculateRetryDelay(attempt);
      logger.warn(
        buildRetryContext({
          operationName,
          attempt,
          maxRetries,
          elapsedMs,
          delayMs,
          error,
        }),
        "Classifier API retry after transport failure",
      );

      await sleep(delayMs);
    }
  }

  const exhaustedError = new Error("Classifier API retry budget exhausted.");
  exhaustedError.code = "CLASSIFIER_RETRY_EXHAUSTED";
  throw exhaustedError;
}

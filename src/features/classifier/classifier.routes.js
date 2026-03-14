import { Router } from "express";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import {
  requestClassifierApi,
  trimTrailingSlash,
} from "./classifier-client.js";

const router = Router();

function buildTargetUrl(baseUrl, pathWithQuery) {
  const trimmedBase = trimTrailingSlash(baseUrl);
  const normalizedPath = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  return `${trimmedBase}${normalizedPath}`;
}

function pickForwardHeaders(headers) {
  const forward = {};
  if (headers.authorization) forward.authorization = headers.authorization;
  if (headers["content-type"]) forward["content-type"] = headers["content-type"];
  if (headers.accept) forward.accept = headers.accept;
  return forward;
}

async function proxyHandler(req, res) {
  if (!env.CLASSIFIER_API_BASE) {
    res.status(503).json({ message: "Classifier API not configured." });
    return;
  }

  const targetUrl = buildTargetUrl(env.CLASSIFIER_API_BASE, req.url);

  try {
    const response = await requestClassifierApi({
      operationName: "classifier_proxy",
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: pickForwardHeaders(req.headers),
      timeout: env.CLASSIFIER_API_TIMEOUT_MS,
      validateStatus: () => true,
    });

    if (response.headers?.["content-type"]) {
      res.set("content-type", response.headers["content-type"]);
    }

    res.status(response.status).send(response.data);
  } catch (error) {
    logger.warn({ err: error }, "Classifier proxy failed");
    res.status(502).json({ message: "Classifier API unreachable." });
  }
}

router.use(proxyHandler);

export { router as classifierRoutes };

import { buildOpenApiDocument } from "./spec.js";

let cachedDocument = null;

export function openApiJsonController(_req, res) {
  if (!cachedDocument) {
    cachedDocument = buildOpenApiDocument();
  }

  res.setHeader("Cache-Control", "no-store");
  res.json(cachedDocument);
}

export function getOpenApiDocument() {
  if (!cachedDocument) {
    cachedDocument = buildOpenApiDocument();
  }
  return cachedDocument;
}

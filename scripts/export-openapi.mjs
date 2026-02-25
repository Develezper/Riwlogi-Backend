import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getOpenApiDocument } from "../src/openapi/openapi.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const docsDir = path.join(backendRoot, "docs");
const outputPath = path.join(docsDir, "openapi.json");

const openApi = getOpenApiDocument();

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

fs.writeFileSync(outputPath, `${JSON.stringify(openApi, null, 2)}\n`);
console.log(`OpenAPI exported to ${outputPath}`);

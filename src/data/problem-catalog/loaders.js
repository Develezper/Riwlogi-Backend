import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getFallbackProblems } from "./fallback-problems.js";
import { cleanString, isValidProblem, normalizeProblem } from "./normalizers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "../../..");
const handoffDir = path.join(backendRoot, "src", "data", "backend-handoff");

function extractProblemEntries(parsed) {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;

  if (Array.isArray(parsed.items)) return parsed.items;
  if (Array.isArray(parsed.problems)) return parsed.problems;

  if (typeof parsed === "object") {
    if (Array.isArray(parsed.problem)) return parsed.problem;
    if (parsed.id || parsed.slug || parsed.title) return [parsed];
  }

  return [];
}

function readJsonIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function loadProblemsFromDirectory(dirPath, source) {
  if (!fs.existsSync(dirPath)) return [];

  const files = fs
    .readdirSync(dirPath)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));

  const problems = [];

  files.forEach((fileName) => {
    const fullPath = path.join(dirPath, fileName);
    const parsed = readJsonIfExists(fullPath);
    const entries = extractProblemEntries(parsed);

    entries.forEach((entry) => {
      const normalized = normalizeProblem(entry, { source });
      if (isValidProblem(normalized)) {
        problems.push(normalized);
      }
    });
  });

  return problems;
}

function loadFromProblemsDirectories() {
  const candidates = [
    path.resolve(backendRoot, "problems"),
    path.resolve(backendRoot, "../frontend/problems"),
    path.resolve(backendRoot, "../problems"),
  ];

  for (const candidate of candidates) {
    const problems = loadProblemsFromDirectory(candidate, "seed");
    if (problems.length > 0) {
      return problems;
    }
  }

  return [];
}

function loadFromHandoff() {
  const files = [
    path.join(handoffDir, "problems.seed.json"),
    path.join(handoffDir, "full-seed.json"),
  ];

  const problems = [];

  files.forEach((filePath) => {
    const parsed = readJsonIfExists(filePath);
    const entries = extractProblemEntries(parsed);

    entries.forEach((entry) => {
      const normalized = normalizeProblem(entry, { source: "handoff" });
      if (isValidProblem(normalized)) {
        problems.push(normalized);
      }
    });
  });

  return problems;
}

function sortProblems(problems) {
  return problems
    .slice()
    .sort((a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}

function dedupeProblems(problems) {
  const unique = new Map();

  problems.forEach((problem) => {
    const key = cleanString(problem.slug || problem.id).toLowerCase();
    if (!key || unique.has(key)) return;
    unique.set(key, problem);
  });

  return [...unique.values()];
}

export function loadCatalog() {
  const fromDirectories = loadFromProblemsDirectories();
  if (fromDirectories.length > 0) {
    return sortProblems(dedupeProblems(fromDirectories));
  }

  const fromHandoff = loadFromHandoff();
  if (fromHandoff.length > 0) {
    return sortProblems(dedupeProblems(fromHandoff));
  }

  return sortProblems(getFallbackProblems());
}

export { sortProblems };

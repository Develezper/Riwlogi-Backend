import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "../..");

function decodeText(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\\n/g, "\n").trim();
}

function sanitizeStarterCode(raw = "") {
  return decodeText(raw)
    .replace(/^\s*\*\s*@backend\/.*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

function normalizeStarterCode(starterCode = {}) {
  const normalized = {};

  Object.entries(starterCode).forEach(([language, snippet]) => {
    normalized[String(language).toLowerCase()] = sanitizeStarterCode(snippet);
  });

  if (!normalized.python) {
    normalized.python = [
      "class Solution:",
      "    def solve(self):",
      "        # Write your solution here",
      "        pass",
    ].join("\n");
  }

  if (!normalized.javascript) {
    normalized.javascript = [
      "function solve() {",
      "  // Write your solution here",
      "}",
    ].join("\n");
  }

  return normalized;
}

function buildStatement(problem) {
  const sections = [];
  const description = decodeText(problem.description);

  if (description) sections.push(`## Description\n${description}`);

  if (Array.isArray(problem.examples) && problem.examples.length) {
    const examples = problem.examples
      .map((example, index) => {
        const lines = [`### Example ${index + 1}`];
        if (example.input) lines.push(`- Input: \`${decodeText(example.input)}\``);
        if (example.output) lines.push(`- Output: \`${decodeText(example.output)}\``);
        if (example.explanation) lines.push(`- Explanation: ${decodeText(example.explanation)}`);
        return lines.join("\n");
      })
      .join("\n\n");

    sections.push(`## Examples\n${examples}`);
  }

  if (Array.isArray(problem.constraints) && problem.constraints.length) {
    const constraints = problem.constraints.map((item) => `- ${decodeText(item)}`).join("\n");
    sections.push(`## Constraints\n${constraints}`);
  }

  return sections.join("\n\n");
}

function normalizeStage(problemId, stage, index) {
  const stageIndex = Number(stage.stage_index || index + 1);
  const tests = Array.isArray(stage.tests) ? stage.tests : [];
  const visibleTests = tests
    .filter((test) => !test.is_hidden)
    .map((test) => ({
      input_text: decodeText(test.input_text),
      expected_text: decodeText(test.expected_text),
    }));

  return {
    id: `${problemId}-stage-${stageIndex}`,
    stage_index: stageIndex,
    prompt_md: decodeText(stage.prompt_md) || `Solve stage ${stageIndex}.`,
    visible_tests: visibleTests,
    hidden_count: tests.length - visibleTests.length,
  };
}

function normalizeProblem(problem) {
  const stages = (problem.stages || [])
    .map((stage, index) => normalizeStage(problem.id, stage, index))
    .sort((a, b) => a.stage_index - b.stage_index);

  return {
    id: problem.id,
    slug: problem.id,
    title: decodeText(problem.title),
    difficulty: Number(problem.difficulty || 1),
    tags: Array.isArray(problem.tags) ? problem.tags : [],
    acceptance: Number(problem.acceptance || 0),
    submissions: Number(problem.submissions || 0),
    statement_md: buildStatement(problem),
    starter_code: normalizeStarterCode(problem.starterCode || {}),
    stages,
    stages_count: stages.length,
  };
}

function resolveProblemsDir() {
  const localDir = path.resolve(backendRoot, "problems");
  if (fs.existsSync(localDir)) return localDir;

  const parentDir = path.resolve(backendRoot, "../problems");
  if (fs.existsSync(parentDir)) return parentDir;

  return null;
}

function loadProblemCatalog() {
  const problemsDir = resolveProblemsDir();
  if (!problemsDir) return [];

  const files = fs.readdirSync(problemsDir).filter((file) => file.endsWith(".json"));

  return files
    .map((fileName) => {
      const filePath = path.resolve(problemsDir, fileName);
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      return normalizeProblem(parsed);
    })
    .sort((a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title));
}

const problemCatalog = loadProblemCatalog();

export function getAllProblems() {
  return problemCatalog;
}

export function getProblemBySlug(slug) {
  const normalized = String(slug || "").trim();
  return problemCatalog.find((problem) => problem.slug === normalized || problem.id === normalized) || null;
}

export function getAllTags() {
  return [...new Set(problemCatalog.flatMap((problem) => problem.tags))].sort((a, b) =>
    a.localeCompare(b),
  );
}

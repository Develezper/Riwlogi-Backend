import { nowIso } from "../../utils/time.js";

function decodeText(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\\n/g, "\n").trim();
}

function clampInt(value, fallback, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  const rounded = Math.round(parsed);
  if (rounded < min || rounded > max) return fallback;
  return rounded;
}

function cleanString(value) {
  return String(value || "").trim();
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
    const key = cleanString(language).toLowerCase();
    if (!key) return;
    normalized[key] = sanitizeStarterCode(String(snippet || ""));
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

  if (!normalized.typescript) {
    normalized.typescript = [
      "function solve(): any {",
      "  // Write your solution here",
      "}",
    ].join("\n");
  }

  return normalized;
}

function normalizeVisibleTests(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((test) => ({
      input_text: decodeText(test?.input_text),
      expected_text: decodeText(test?.expected_text),
    }))
    .filter((test) => test.input_text || test.expected_text);
}

function normalizeTests(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((test) => ({
      input_text: decodeText(test?.input_text),
      expected_text: decodeText(test?.expected_text),
      is_hidden: Boolean(test?.is_hidden),
    }))
    .filter((test) => test.input_text || test.expected_text);
}

function normalizeStage(problemId, rawStage, index) {
  const stageIndex = clampInt(rawStage?.stage_index, index + 1, { min: 1, max: 100 });
  const stageId = cleanString(rawStage?.id) || `${problemId || "problem"}-stage-${stageIndex}`;

  const tests = normalizeTests(rawStage?.tests);
  let visibleTests = normalizeVisibleTests(rawStage?.visible_tests);

  if (visibleTests.length === 0 && tests.length > 0) {
    visibleTests = tests
      .filter((test) => !test.is_hidden)
      .map((test) => ({
        input_text: test.input_text,
        expected_text: test.expected_text,
      }));
  }

  const derivedTests =
    tests.length > 0
      ? tests
      : visibleTests.map((test) => ({
          input_text: test.input_text,
          expected_text: test.expected_text,
          is_hidden: false,
        }));

  const explicitHiddenCount = rawStage?.hidden_count;
  const hiddenCount = Number.isFinite(Number(explicitHiddenCount))
    ? clampInt(explicitHiddenCount, 0, { min: 0, max: 10000 })
    : Math.max(0, derivedTests.length - visibleTests.length);

  return {
    id: stageId,
    stage_index: stageIndex,
    prompt_md: decodeText(rawStage?.prompt_md) || `Solve stage ${stageIndex}.`,
    time_limit_ms: clampInt(rawStage?.time_limit_ms, 0, { min: 0, max: 20000 }),
    tests: derivedTests,
    visible_tests: visibleTests,
    hidden_count: hiddenCount,
  };
}

export function normalizeProblem(rawProblem, { source = "seed" } = {}) {
  const problemId = cleanString(rawProblem?.id);
  const problemSlug = cleanString(rawProblem?.slug || rawProblem?.id);

  const stagesSource = Array.isArray(rawProblem?.stages) ? rawProblem.stages : [];
  const stages = stagesSource
    .map((stage, index) => normalizeStage(problemId || problemSlug || "problem", stage, index))
    .sort((a, b) => a.stage_index - b.stage_index);

  const normalizedStages =
    stages.length > 0
      ? stages
      : [
          normalizeStage(
            problemId || problemSlug || "problem",
            {
              id: `${problemId || problemSlug || "problem"}-stage-1`,
              stage_index: 1,
              prompt_md: "Implement the requested solution.",
              visible_tests: [],
              hidden_count: 0,
            },
            0,
          ),
        ];

  const tags = Array.isArray(rawProblem?.tags)
    ? [...new Set(rawProblem.tags.map((tag) => cleanString(tag)).filter(Boolean))]
    : [];

  const starterCode = normalizeStarterCode(rawProblem?.starter_code || rawProblem?.starterCode || {});
  const title = decodeText(rawProblem?.title) || "Untitled Problem";

  return {
    id: problemId,
    slug: problemSlug,
    title,
    difficulty: clampInt(rawProblem?.difficulty, 1, { min: 1, max: 3 }),
    tags,
    acceptance: Number(rawProblem?.acceptance || 0),
    submissions: clampInt(rawProblem?.submissions, 0, { min: 0, max: 100000000 }),
    description: decodeText(rawProblem?.description),
    examples: Array.isArray(rawProblem?.examples) ? rawProblem.examples : [],
    constraints: Array.isArray(rawProblem?.constraints) ? rawProblem.constraints : [],
    statement_md:
      decodeText(rawProblem?.statement_md) ||
      decodeText(rawProblem?.statementMd) ||
      "No description available.",
    starter_code: starterCode,
    stages: normalizedStages,
    stages_count: clampInt(rawProblem?.stages_count, normalizedStages.length, {
      min: 1,
      max: 100,
    }),
    status: cleanString(rawProblem?.status || "published").toLowerCase(),
    source: cleanString(rawProblem?.source || source).toLowerCase(),
    last_generated_prompt: decodeText(rawProblem?.last_generated_prompt || ""),
    created_at: cleanString(rawProblem?.created_at) || nowIso(),
    updated_at: cleanString(rawProblem?.updated_at) || nowIso(),
  };
}

export function isValidProblem(problem) {
  if (!problem) return false;
  if (!problem.id || problem.id === "undefined") return false;
  if (!problem.slug || problem.slug === "undefined") return false;
  if (!problem.title || problem.title.trim().length === 0) return false;
  if (!Array.isArray(problem.stages) || problem.stages.length === 0) return false;
  return true;
}

export { cleanString };

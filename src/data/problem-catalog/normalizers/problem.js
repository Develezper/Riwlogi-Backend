import { nowIso } from "../../../utils/time.js";
import { clampInt, cleanString, decodeText, normalizeStarterCode } from "./common.js";
import { normalizeStage } from "./stage.js";

function normalizeSingleStage(problemId, problemSlug, rawStages) {
  const baseId = problemId || problemSlug || "problem";
  const source = Array.isArray(rawStages) ? rawStages : [];
  const firstStage = source[0] && typeof source[0] === "object" ? source[0] : {
    id: `${baseId}-stage-1`,
    stage_index: 1,
    prompt_md: "Implement the requested solution.",
    visible_tests: [],
    hidden_count: 0,
  };

  const normalized = normalizeStage(baseId, firstStage, 0);

  return [
    {
      ...normalized,
      id: `${baseId}-stage-1`,
      stage_index: 1,
      prompt_md: normalized.prompt_md || "Implement the requested solution.",
    },
  ];
}

export function normalizeProblem(rawProblem, { source = "seed" } = {}) {
  const problemId = cleanString(rawProblem?.id);
  const problemSlug = cleanString(rawProblem?.slug || rawProblem?.id);
  const normalizedStages = normalizeSingleStage(problemId, problemSlug, rawProblem?.stages);

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
    stages_count: 1,
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

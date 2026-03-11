import { nowIso } from "../../../utils/time.js";
import { clampInt, cleanString, decodeText, normalizeStarterCode } from "./common.js";
import { normalizeStage } from "./stage.js";

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

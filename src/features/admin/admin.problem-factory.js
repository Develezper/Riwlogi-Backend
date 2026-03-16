function clampDifficulty(value, fallback = 2) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 1) return 1;
  if (parsed > 3) return 3;
  return Math.round(parsed);
}

function normalizeTags(rawTags) {
  const source = Array.isArray(rawTags) ? rawTags : [];
  const unique = [];
  const seen = new Set();

  for (const tag of source) {
    const value = String(tag || "")
      .trim()
      .toLowerCase();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    unique.push(value);
    if (unique.length >= 8) break;
  }

  return unique.length ? unique : ["ai-generated"];
}

function normalizeStarterCode(rawStarter = {}) {
  const source = rawStarter && typeof rawStarter === "object" ? rawStarter : {};
  const python = String(source.python || "").trimEnd();
  const javascript = String(source.javascript || "").trimEnd();

  return {
    python: python || "def solve(data):\n    # Write your solution here\n    pass",
    javascript: javascript || "function solve(data) {\n  // Write your solution here\n}",
  };
}

function normalizeVisibleTests(rawVisibleTests) {
  const source = Array.isArray(rawVisibleTests) ? rawVisibleTests : [];
  const tests = source
    .map((test) => {
      const inputText = String(test?.input_text || "").trim();
      const expectedText = String(test?.expected_text || "").trim();
      if (!inputText || !expectedText) return null;
      return { input_text: inputText, expected_text: expectedText };
    })
    .filter(Boolean)
    .slice(0, 6);

  if (tests.length) return tests;

  return [
    {
      input_text: "example_input_stage_1",
      expected_text: "example_output_stage_1",
    },
  ];
}

function normalizeHiddenTests(rawHiddenTests) {
  const source = Array.isArray(rawHiddenTests) ? rawHiddenTests : [];
  return source
    .map((test) => {
      const inputText = String(test?.input_text || "").trim();
      const expectedText = String(test?.expected_text || "").trim();
      if (!inputText || !expectedText) return null;
      return { input_text: inputText, expected_text: expectedText };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeSingleStage(problemId, rawStages) {
  const source = Array.isArray(rawStages) ? rawStages : [];
  const stage = source[0] && typeof source[0] === "object" ? source[0] : {};

  const promptMd = String(stage?.prompt_md || "").trim();
  const hiddenTests = normalizeHiddenTests(stage?.hidden_tests);
  const hiddenCount = Number.isFinite(Number(stage?.hidden_count))
    ? Math.max(0, Math.min(2000, Number(stage.hidden_count)))
    : hiddenTests.length || 2;

  return [
    {
      id: `${problemId}-stage-1`,
      stage_index: 1,
      prompt_md: promptMd || "Solve the full problem in a single stage.",
      hidden_count: hiddenCount,
      visible_tests: normalizeVisibleTests(stage?.visible_tests),
      hidden_tests: hiddenTests,
    },
  ];
}

function normalizeAiPayload(problemId, title, prompt, generated) {
  const source = generated && typeof generated === "object" ? generated : {};
  const resolvedTitle = String(source.title || "").trim() || title;
  const statement = String(source.statement_md || "").trim();
  const stages = normalizeSingleStage(problemId, source.stages);

  return {
    title: resolvedTitle,
    difficulty: clampDifficulty(source.difficulty, 2),
    tags: normalizeTags(source.tags),
    statement_md: statement || `## AI Generated Problem\n\nPrompt:\n${prompt}`,
    starter_code: normalizeStarterCode(source.starter_code),
    stages,
    stages_count: 1,
  };
}

export function buildAiGeneratedProblemDraft({
  problemId,
  title,
  prompt,
  createdAt,
  updatedAt,
  generated = null,
}) {
  const ai = normalizeAiPayload(problemId, title, prompt, generated);

  return {
    id: problemId,
    slug: problemId,
    title: ai.title,
    difficulty: ai.difficulty,
    tags: ai.tags,
    acceptance: 0,
    submissions: 0,
    statement_md: ai.statement_md,
    starter_code: ai.starter_code,
    stages: ai.stages,
    stages_count: ai.stages_count,
    status: "draft",
    source: "ai",
    last_generated_prompt: prompt,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "docs", "backend-handoff");

const LEADERBOARD_SEED = [
  { username: "algorithmist", score: 4850, solved: 87, streak: 32 },
  { username: "code_ninja", score: 4720, solved: 82, streak: 28 },
  { username: "byte_master", score: 4580, solved: 79, streak: 21 },
  { username: "devSara", score: 4320, solved: 74, streak: 18 },
  { username: "logic_lord", score: 4100, solved: 71, streak: 15 },
  { username: "func_wizard", score: 3920, solved: 68, streak: 14 },
  { username: "recursion_queen", score: 3780, solved: 65, streak: 12 },
  { username: "stack_overflow", score: 3650, solved: 62, streak: 11 },
  { username: "dp_guru", score: 3500, solved: 59, streak: 9 },
  { username: "hash_hero", score: 3350, solved: 56, streak: 7 },
];

const USERS_SEED = [
  {
    id: "user_demo",
    username: "demo",
    email: "demo@riwlogi.dev",
    password_plain: "123456",
    display_name: "Demo User",
    created_at: "2026-01-03T10:00:00.000Z",
  },
  {
    id: "user_code_ninja",
    username: "code_ninja",
    email: "code@riwlogi.dev",
    password_plain: "123456",
    display_name: "Code Ninja",
    created_at: "2025-11-22T10:00:00.000Z",
  },
];

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
    normalized[String(language).toLowerCase()] = sanitizeStarterCode(String(snippet));
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
    normalized.javascript = ["function solve() {", "  // Write your solution here", "}"].join("\n");
  }

  return normalized;
}

function buildStatement(problem) {
  const sections = [];
  const description = decodeText(problem.description);

  if (description) {
    sections.push(`## Description\n${description}`);
  }

  if (Array.isArray(problem.examples) && problem.examples.length > 0) {
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

  if (Array.isArray(problem.constraints) && problem.constraints.length > 0) {
    const constraints = problem.constraints.map((constraint) => `- ${decodeText(constraint)}`).join("\n");
    sections.push(`## Constraints\n${constraints}`);
  }

  return sections.join("\n\n");
}

function normalizeTests(tests = []) {
  return tests.map((test) => ({
    input_text: decodeText(test.input_text),
    expected_text: decodeText(test.expected_text),
    is_hidden: Boolean(test.is_hidden),
  }));
}

function normalizeStage(problemId, stage, index) {
  const stageIndex = Number(stage.stage_index || index + 1);
  const tests = normalizeTests(Array.isArray(stage.tests) ? stage.tests : []);
  const visibleTests = tests
    .filter((test) => !test.is_hidden)
    .map((test) => ({
      input_text: test.input_text,
      expected_text: test.expected_text,
    }));

  return {
    id: `${problemId}-stage-${stageIndex}`,
    stage_index: stageIndex,
    prompt_md: decodeText(stage.prompt_md) || `Solve stage ${stageIndex}.`,
    time_limit_ms: Number(stage.time_limit_ms || 0),
    tests,
    visible_tests: visibleTests,
    hidden_count: tests.length - visibleTests.length,
  };
}

function normalizeProblem(problem) {
  const stages = (Array.isArray(problem.stages) ? problem.stages : [])
    .map((stage, index) => normalizeStage(problem.id, stage, index))
    .sort((a, b) => a.stage_index - b.stage_index);

  return {
    id: String(problem.id),
    slug: String(problem.id),
    title: decodeText(problem.title),
    difficulty: Number(problem.difficulty || 1),
    tags: Array.isArray(problem.tags) ? problem.tags : [],
    acceptance: Number(problem.acceptance || 0),
    submissions: Number(problem.submissions || 0),
    description: decodeText(problem.description),
    examples: Array.isArray(problem.examples) ? problem.examples : [],
    constraints: Array.isArray(problem.constraints) ? problem.constraints : [],
    statement_md: buildStatement(problem),
    starter_code: normalizeStarterCode(problem.starterCode || {}),
    stages,
    stages_count: stages.length,
  };
}

function problemSummary(problem) {
  return {
    id: problem.id,
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    tags: problem.tags,
    acceptance: problem.acceptance,
    submissions: problem.submissions,
    stages_count: problem.stages_count,
  };
}

async function loadProblems() {
  const candidates = [
    path.join(ROOT_DIR, "problems"),
    path.join(ROOT_DIR, "..", "frontend", "problems"),
    path.join(ROOT_DIR, "..", "problems"),
  ];

  let problemsDir = null;
  let files = [];

  for (const candidate of candidates) {
    try {
      const entries = await readdir(candidate, { withFileTypes: true });
      const jsonFiles = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));

      if (jsonFiles.length > 0) {
        problemsDir = candidate;
        files = jsonFiles;
        break;
      }
    } catch {
      // Continue searching other candidate directories.
    }
  }

  if (!problemsDir || files.length === 0) {
    throw new Error("No se encontraron problemas JSON para exportar seed.");
  }

  const sourcePath = path.relative(ROOT_DIR, problemsDir) || "problems";
  loadProblems.sourcePath = sourcePath;

  const problems = [];
  for (const fileName of files) {
    const filePath = path.join(problemsDir, fileName);
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    problems.push(normalizeProblem(parsed));
  }

  return problems.sort(
    (a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
  );
}

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main() {
  const problems = await loadProblems();
  const tags = [...new Set(problems.flatMap((problem) => problem.tags))].sort((a, b) =>
    a.localeCompare(b),
  );

  const fullSeed = {
    generated_at: new Date().toISOString(),
    source: {
      problems_glob: `${loadProblems.sourcePath || "problems"}/*.json`,
      users_seed: "src/shared/services/api/local-provider.js",
      leaderboard_seed: "src/shared/services/api/local-provider.js",
    },
    counts: {
      problems: problems.length,
      tags: tags.length,
      users: USERS_SEED.length,
      leaderboard_entries: LEADERBOARD_SEED.length,
    },
    users_seed: USERS_SEED,
    leaderboard_seed: LEADERBOARD_SEED,
    tags,
    problems,
    api_payload_examples: {
      problems_list: {
        items: problems.map(problemSummary),
      },
      problems_tags: {
        items: tags,
      },
      problem_by_slug: {
        item: problems[0] || null,
      },
    },
  };

  await mkdir(OUTPUT_DIR, { recursive: true });

  await Promise.all([
    writeJson(path.join(OUTPUT_DIR, "full-seed.json"), fullSeed),
    writeJson(path.join(OUTPUT_DIR, "problems.seed.json"), { items: problems }),
    writeJson(path.join(OUTPUT_DIR, "users.seed.json"), { items: USERS_SEED }),
    writeJson(path.join(OUTPUT_DIR, "leaderboard.seed.json"), { items: LEADERBOARD_SEED }),
  ]);

  console.log(`Seed export created in ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

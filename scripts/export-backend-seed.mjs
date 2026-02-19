import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAllProblems, getAllTags } from "../src/data/problem-catalog.js";
import { DEFAULT_USERS, LEADERBOARD_SEED } from "../src/data/seeds.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.resolve(__dirname, "../src/data/backend-handoff");

const SOURCE_CANDIDATES = [
  path.resolve(ROOT_DIR, "problems"),
  path.resolve(ROOT_DIR, "../frontend/problems"),
  path.resolve(ROOT_DIR, "../problems"),
];

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

function normalizeUserSeed(users) {
  return users.map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    password_plain: user.password || "123456",
    role: user.role || "user",
    display_name: user.display_name || user.username,
    created_at: user.created_at,
  }));
}

async function detectSourcePath() {
  for (const candidate of SOURCE_CANDIDATES) {
    try {
      const entries = await readdir(candidate, { withFileTypes: true });
      const hasJson = entries.some((entry) => entry.isFile() && entry.name.endsWith(".json"));
      if (hasJson) {
        return path.relative(ROOT_DIR, candidate) || ".";
      }
    } catch {
      // Candidate does not exist.
    }
  }

  return "runtime-catalog";
}

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main() {
  const problems = getAllProblems();
  if (!Array.isArray(problems) || problems.length === 0) {
    throw new Error("No se encontraron problemas validos para exportar.");
  }

  const tags = getAllTags();
  const usersSeed = normalizeUserSeed(DEFAULT_USERS);
  const sourcePath = await detectSourcePath();
  const problemsGlob = sourcePath === "runtime-catalog" ? sourcePath : `${sourcePath}/*.json`;

  const fullSeed = {
    generated_at: new Date().toISOString(),
    source: {
      problems_glob: problemsGlob,
      users_seed: "src/data/seeds.js",
      leaderboard_seed: "src/data/seeds.js",
    },
    counts: {
      problems: problems.length,
      tags: tags.length,
      users: usersSeed.length,
      leaderboard_entries: LEADERBOARD_SEED.length,
    },
    users_seed: usersSeed,
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
    writeJson(path.join(OUTPUT_DIR, "users.seed.json"), { items: usersSeed }),
    writeJson(path.join(OUTPUT_DIR, "leaderboard.seed.json"), { items: LEADERBOARD_SEED }),
  ]);

  console.log(`Seed export created in ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "../..");
const handoffDir = path.join(backendRoot, "src", "data", "backend-handoff");

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
  const tests = Array.isArray(stage.tests)
    ? stage.tests.map((test) => ({
      input_text: decodeText(test.input_text),
      expected_text: decodeText(test.expected_text),
      is_hidden: Boolean(test.is_hidden),
    }))
    : [];

  const visibleTests = (Array.isArray(stage.visible_tests) ? stage.visible_tests : tests.filter((test) => !test.is_hidden)).map(
    (test) => ({
      input_text: decodeText(test.input_text),
      expected_text: decodeText(test.expected_text),
    }),
  );

  return {
    id: String(stage.id || `${problemId}-stage-${stageIndex}`),
    stage_index: stageIndex,
    prompt_md: decodeText(stage.prompt_md) || `Solve stage ${stageIndex}.`,
    time_limit_ms: Number(stage.time_limit_ms || 0),
    tests,
    visible_tests: visibleTests,
    hidden_count: Number(stage.hidden_count ?? tests.length - visibleTests.length),
  };
}

function normalizeProblem(problem) {
  const rawStarter = problem.starter_code || problem.starterCode || {};
  const stages = (Array.isArray(problem.stages) ? problem.stages : [])
    .map((stage, index) => normalizeStage(problem.id, stage, index))
    .sort((a, b) => a.stage_index - b.stage_index);

  const title = decodeText(problem.title) || String(problem.id || "Untitled Problem");

  return {
    id: String(problem.id || "problem-" + Date.now()),
    slug: String(problem.slug || problem.id || "problem-" + Date.now()),
    title: title,
    difficulty: Number(problem.difficulty || 1),
    tags: Array.isArray(problem.tags) ? problem.tags : [],
    acceptance: Number(problem.acceptance || 0),
    submissions: Number(problem.submissions || 0),
    description: decodeText(problem.description) || "",
    examples: Array.isArray(problem.examples) ? problem.examples : [],
    constraints: Array.isArray(problem.constraints) ? problem.constraints : [],
    statement_md: decodeText(problem.statement_md) || buildStatement(problem) || "No description available.",
    starter_code: normalizeStarterCode(rawStarter),
    stages,
    stages_count: Number(problem.stages_count || stages.length),
  };
}

function readJsonIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadFromHandoff() {
  const problemsSeedPath = path.join(handoffDir, "problems.seed.json");
  const fullSeedPath = path.join(handoffDir, "full-seed.json");

  const problemsSeed = readJsonIfExists(problemsSeedPath);
  if (problemsSeed && Array.isArray(problemsSeed.items) && problemsSeed.items.length) {
    return problemsSeed.items.map(normalizeProblem);
  }

  const fullSeed = readJsonIfExists(fullSeedPath);
  if (fullSeed && Array.isArray(fullSeed.problems) && fullSeed.problems.length) {
    return fullSeed.problems.map(normalizeProblem);
  }

  return [];
}

function resolveProblemsDir() {
  const localDir = path.resolve(backendRoot, "problems");
  if (fs.existsSync(localDir)) return localDir;

  const parentDir = path.resolve(backendRoot, "../problems");
  if (fs.existsSync(parentDir)) return parentDir;

  return null;
}

function loadFromProblemsDirectory() {
  const problemsDir = resolveProblemsDir();
  if (!problemsDir) return [];

  const files = fs.readdirSync(problemsDir).filter((file) => file.endsWith(".json"));

  return files.map((fileName) => {
    const filePath = path.resolve(problemsDir, fileName);
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return normalizeProblem(parsed);
  });
}

function loadProblemCatalog() {
  const fromHandoff = loadFromHandoff();
  const source = fromHandoff.length ? fromHandoff : loadFromProblemsDirectory();

  // Filtrar problemas válidos
  const validProblems = source.filter((problem) => {
    const isValid = problem && problem.id && problem.id !== "undefined" && problem.title && problem.title.trim().length > 0;
    if (!isValid) {
      console.warn(`[Problem Catalog] Skipping invalid problem:`, problem?.id || 'unknown');
    }
    return isValid;
  });

  console.log(`[Problem Catalog] Loaded ${validProblems.length} valid problems from seeds`);

  // Si no hay problemas válidos, cargar problemas de ejemplo
  if (validProblems.length === 0) {
    console.log('[Problem Catalog] No valid problems found, loading default examples');
    return getDefaultProblems();
  }

  return validProblems.sort(
    (a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
  );
}

function getDefaultProblems() {
  const problems = [
    {
      id: "two-sum",
      slug: "two-sum",
      title: "Two Sum",
      difficulty: 1,
      tags: ["Arrays", "Hash Table"],
      acceptance: 45,
      submissions: 1200,
      description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
      examples: [
        {
          input: "nums = [2,7,11,15], target = 9",
          output: "[0,1]",
          explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
        }
      ],
      constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "Only one valid answer exists."],
      statement_md: "## Description\\nGiven an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\\n\\n## Examples\\n### Example 1\\n- Input: `nums = [2,7,11,15], target = 9`\\n- Output: `[0,1]`\\n- Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].\\n\\n## Constraints\\n- 2 <= nums.length <= 10^4\\n- -10^9 <= nums[i] <= 10^9\\n- Only one valid answer exists.",
      starterCode: {
        python: "def two_sum(nums, target):\\n    # Write your solution here\\n    pass",
        javascript: "function twoSum(nums, target) {\\n  // Write your solution here\\n}",
        typescript: "function twoSum(nums: number[], target: number): number[] {\\n  // Write your solution here\\n  return [];\\n}"
      },
      stages: [
        {
          id: "two-sum-stage-1",
          stage_index: 1,
          prompt_md: "Implement a basic solution that finds two numbers that add up to the target.",
          time_limit_ms: 1000,
          visible_tests: [
            { input_text: "[2, 7, 11, 15], 9", expected_text: "[0, 1]" }
          ],
          hidden_count: 3
        },
        {
          id: "two-sum-stage-2",
          stage_index: 2,
          prompt_md: "Optimize your solution to handle larger arrays efficiently.",
          time_limit_ms: 1000,
          visible_tests: [
            { input_text: "[3, 2, 4], 6", expected_text: "[1, 2]" },
            { input_text: "[3, 3], 6", expected_text: "[0, 1]" }
          ],
          hidden_count: 4
        },
        {
          id: "two-sum-stage-3",
          stage_index: 3,
          prompt_md: "Handle edge cases and achieve optimal time complexity O(n).",
          time_limit_ms: 1000,
          visible_tests: [
            { input_text: "[1, 5, 3, 7], 8", expected_text: "[1, 2]" }
          ],
          hidden_count: 5
        }
      ],
      stages_count: 3
    },
    {
      id: "reverse-string",
      slug: "reverse-string",
      title: "Reverse String",
      difficulty: 1,
      tags: ["Strings", "Two Pointers"],
      acceptance: 72,
      submissions: 850,
      description: "Write a function that reverses a string. The input string is given as an array of characters.",
      examples: [
        {
          input: "s = ['h','e','l','l','o']",
          output: "['o','l','l','e','h']",
          explanation: ""
        }
      ],
      constraints: ["1 <= s.length <= 10^5", "s[i] is a printable ascii character."],
      statement_md: "## Description\\nWrite a function that reverses a string. The input string is given as an array of characters.\\n\\n## Examples\\n### Example 1\\n- Input: `s = ['h','e','l','l','o']`\\n- Output: `['o','l','l','e','h']`\\n\\n## Constraints\\n- 1 <= s.length <= 10^5\\n- s[i] is a printable ascii character.",
      starterCode: {
        python: "def reverse_string(s):\\n    # Write your solution here\\n    pass",
        javascript: "function reverseString(s) {\\n  // Write your solution here\\n}",
        typescript: "function reverseString(s: string[]): void {\\n  // Write your solution here\\n}"
      },
      stages: [
        {
          id: "reverse-string-stage-1",
          stage_index: 1,
          prompt_md: "Reverse the string array using a simple approach.",
          time_limit_ms: 1000,
          visible_tests: [
            { input_text: "['h','e','l','l','o']", expected_text: "['o','l','l','e','h']" }
          ],
          hidden_count: 2
        },
        {
          id: "reverse-string-stage-2",
          stage_index: 2,
          prompt_md: "Optimize to use O(1) extra space (in-place reversal).",
          time_limit_ms: 1000,
          visible_tests: [
            { input_text: "['H','a','n','n','a','h']", expected_text: "['h','a','n','n','a','H']" }
          ],
          hidden_count: 3
        },
        {
          id: "reverse-string-stage-3",
          stage_index: 3,
          prompt_md: "Handle Unicode characters and special cases.",
          time_limit_ms: 1000,
          visible_tests: [
            { input_text: "['a','b','c']", expected_text: "['c','b','a']" }
          ],
          hidden_count: 3
        }
      ],
      stages_count: 3
    },
    {
      id: "valid-parentheses",
      slug: "valid-parentheses",
      title: "Valid Parentheses",
      difficulty: 2,
      tags: ["Stack", "Strings"],
      acceptance: 38,
      submissions: 2100,
      description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
      examples: [
        {
          input: "s = '()'",
          output: "true",
          explanation: ""
        },
        {
          input: "s = '()[]{}'",
          output: "true",
          explanation: ""
        },
        {
          input: "s = '(]'",
          output: "false",
          explanation: ""
        }
      ],
      constraints: ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'."],
      statement_md: "## Description\\nGiven a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\\n\\n## Examples\\n### Example 1\\n- Input: `s = '()'`\\n- Output: `true`\\n\\n### Example 2\\n- Input: `s = '()[]{}'`\\n- Output: `true`\\n\\n### Example 3\\n- Input: `s = '(]'`\\n- Output: `false`\\n\\n## Constraints\\n- 1 <= s.length <= 10^4\\n- s consists of parentheses only '()[]{}'.",
      starterCode: {
        python: "def is_valid(s):\\n    # Write your solution here\\n    pass",
        javascript: "function isValid(s) {\\n  // Write your solution here\\n}",
        typescript: "function isValid(s: string): boolean {\\n  // Write your solution here\\n  return false;\\n}"
      },
      stages: [
        {
          id: "valid-parentheses-stage-1",
          stage_index: 1,
          prompt_md: "Check if simple brackets are balanced.",
          time_limit_ms: 1000,
          visible_tests: [
            { input_text: "()", expected_text: "true" },
            { input_text: "(]", expected_text: "false" }
          ],
          hidden_count: 4
        },
        {
          id: "valid-parentheses-stage-2",
          stage_index: 2,
          prompt_md: "Handle all three types of brackets: (), [], {}",
          time_limit_ms: 1000,
          visible_tests: [
            { input_text: "()[]{}", expected_text: "true" },
            { input_text: "([)]", expected_text: "false" }
          ],
          hidden_count: 5
        },
        {
          id: "valid-parentheses-stage-3",
          stage_index: 3,
          prompt_md: "Optimize for nested and complex bracket patterns.",
          time_limit_ms: 1000,
          visible_tests: [
            { input_text: "{[]}", expected_text: "true" },
            { input_text: "((", expected_text: "false" }
          ],
          hidden_count: 6
        }
      ],
      stages_count: 3
    },
    {
      id: "merge-sorted-arrays",
      slug: "merge-sorted-arrays",
      title: "Merge Two Sorted Arrays",
      difficulty: 2,
      tags: ["Arrays", "Sorting", "Two Pointers"],
      acceptance: 41,
      submissions: 1650,
      description: "You are given two integer arrays nums1 and nums2, sorted in non-decreasing order. Merge nums1 and nums2 into a single array sorted in non-decreasing order.",
      examples: [
        {
          input: "nums1 = [1,2,3], nums2 = [2,5,6]",
          output: "[1,2,2,3,5,6]",
          explanation: ""
        }
      ],
      constraints: ["nums1.length + nums2.length <= 2000", "-10^9 <= nums1[i], nums2[i] <= 10^9"],
      statement_md: "## Description\\nYou are given two integer arrays nums1 and nums2, sorted in non-decreasing order. Merge nums1 and nums2 into a single array sorted in non-decreasing order.\\n\\n## Examples\\n### Example 1\\n- Input: `nums1 = [1,2,3], nums2 = [2,5,6]`\\n- Output: `[1,2,2,3,5,6]`\\n\\n## Constraints\\n- nums1.length + nums2.length <= 2000\\n- -10^9 <= nums1[i], nums2[i] <= 10^9",
      starterCode: {
        python: "def merge(nums1, nums2):\\n    # Write your solution here\\n    pass",
        javascript: "function merge(nums1, nums2) {\\n  // Write your solution here\\n}",
        typescript: "function merge(nums1: number[], nums2: number[]): number[] {\\n  // Write your solution here\\n  return [];\\n}"
      },
      stages: [
        {
          id: "merge-sorted-arrays-stage-1",
          stage_index: 1,
          prompt_md: "Merge two small sorted arrays.",
          time_limit_ms: 1000,
          visible_tests: [
            { input_text: "[1,2,3], [2,5,6]", expected_text: "[1,2,2,3,5,6]" }
          ],
          hidden_count: 3
        },
        {
          id: "merge-sorted-arrays-stage-2",
          stage_index: 2,
          prompt_md: "Handle arrays with duplicates efficiently.",
          time_limit_ms: 1000,
          visible_tests: [
            { input_text: "[1,1], [1,1]", expected_text: "[1,1,1,1]" }
          ],
          hidden_count: 4
        },
        {
          id: "merge-sorted-arrays-stage-3",
          stage_index: 3,
          prompt_md: "Optimize for large arrays with minimal extra space.",
          time_limit_ms: 1000,
          visible_tests: [
            { input_text: "[1,3,5], [2,4,6]", expected_text: "[1,2,3,4,5,6]" }
          ],
          hidden_count: 5
        }
      ],
      stages_count: 3
    },
    {
      id: "longest-substring",
      slug: "longest-substring",
      title: "Longest Substring Without Repeating Characters",
      difficulty: 3,
      tags: ["Hash Table", "Strings", "Sliding Window"],
      acceptance: 33,
      submissions: 3200,
      description: "Given a string s, find the length of the longest substring without repeating characters.",
      examples: [
        {
          input: "s = 'abcabcbb'",
          output: "3",
          explanation: "The answer is 'abc', with the length of 3."
        },
        {
          input: "s = 'bbbbb'",
          output: "1",
          explanation: "The answer is 'b', with the length of 1."
        }
      ],
      constraints: ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces."],
      statement_md: "## Description\\nGiven a string s, find the length of the longest substring without repeating characters.\\n\\n## Examples\\n### Example 1\\n- Input: `s = 'abcabcbb'`\\n- Output: `3`\\n- Explanation: The answer is 'abc', with the length of 3.\\n\\n### Example 2\\n- Input: `s = 'bbbbb'`\\n- Output: `1`\\n- Explanation: The answer is 'b', with the length of 1.\\n\\n## Constraints\\n- 0 <= s.length <= 5 * 10^4\\n- s consists of English letters, digits, symbols and spaces.",
      starterCode: {
        python: "def length_of_longest_substring(s):\\n    # Write your solution here\\n    pass",
        javascript: "function lengthOfLongestSubstring(s) {\\n  // Write your solution here\\n}",
        typescript: "function lengthOfLongestSubstring(s: string): number {\\n  // Write your solution here\\n  return 0;\\n}"
      },
      stages: [
        {
          id: "longest-substring-stage-1",
          stage_index: 1,
          prompt_md: "Find the longest substring for simple cases.",
          time_limit_ms: 2000,
          visible_tests: [
            { input_text: "abcabcbb", expected_text: "3" }
          ],
          hidden_count: 5
        },
        {
          id: "longest-substring-stage-2",
          stage_index: 2,
          prompt_md: "Handle strings with all repeating characters.",
          time_limit_ms: 2000,
          visible_tests: [
            { input_text: "bbbbb", expected_text: "1" },
            { input_text: "pwwkew", expected_text: "3" }
          ],
          hidden_count: 6
        },
        {
          id: "longest-substring-stage-3",
          stage_index: 3,
          prompt_md: "Optimize for very long strings with O(n) complexity.",
          time_limit_ms: 2000,
          visible_tests: [
            { input_text: "dvdf", expected_text: "3" }
          ],
          hidden_count: 8
        }
      ],
      stages_count: 3
    }
  ];

  // Normalizar cada problema usando la misma función que procesa los archivos JSON
  return problems.map((p) => normalizeProblem(p));
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

import { normalizeProblem } from "./normalizers.js";

export function getFallbackProblems() {
  const fallback = [
    {
      id: "two-sum",
      slug: "two-sum",
      title: "Two Sum",
      difficulty: 1,
      tags: ["arrays", "hash-table"],
      acceptance: 49.2,
      submissions: 14523,
      statement_md:
        "## Description\nGiven an array of integers nums and an integer target, return indices of two numbers such that they add up to target.",
      starter_code: {
        python: "def solve(nums, target):\n    # Write your solution here\n    pass",
        javascript: "function solve(nums, target) {\n  // Write your solution here\n}",
        typescript: "function solve(nums: number[], target: number): number[] {\n  return [];\n}",
      },
      stages: [
        {
          id: "two-sum-stage-1",
          stage_index: 1,
          prompt_md: "Solve the basic two-sum case.",
          visible_tests: [{ input_text: "[2,7,11,15], 9", expected_text: "[0,1]" }],
          hidden_count: 3,
        },
      ],
      stages_count: 1,
      source: "fallback",
      status: "published",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "valid-parentheses",
      slug: "valid-parentheses",
      title: "Valid Parentheses",
      difficulty: 2,
      tags: ["stack", "strings"],
      acceptance: 41.0,
      submissions: 9540,
      statement_md:
        "## Description\nGiven a string containing only brackets, determine whether it is valid.",
      starter_code: {
        python: "def solve(s):\n    # Write your solution here\n    pass",
        javascript: "function solve(s) {\n  // Write your solution here\n}",
        typescript: "function solve(s: string): boolean {\n  return false;\n}",
      },
      stages: [
        {
          id: "valid-parentheses-stage-1",
          stage_index: 1,
          prompt_md: "Validate small bracket strings.",
          visible_tests: [
            { input_text: "()", expected_text: "true" },
            { input_text: "(]", expected_text: "false" },
          ],
          hidden_count: 4,
        },
      ],
      stages_count: 1,
      source: "fallback",
      status: "published",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "reverse-string",
      slug: "reverse-string",
      title: "Reverse String",
      difficulty: 1,
      tags: ["strings", "two-pointers"],
      acceptance: 72.0,
      submissions: 7430,
      statement_md:
        "## Description\nWrite a function that reverses a string represented as an array of characters.",
      starter_code: {
        python: "def solve(chars):\n    # Write your solution here\n    pass",
        javascript: "function solve(chars) {\n  // Write your solution here\n}",
        typescript: "function solve(chars: string[]): void {\n}",
      },
      stages: [
        {
          id: "reverse-string-stage-1",
          stage_index: 1,
          prompt_md: "Reverse the input array in-place.",
          visible_tests: [{ input_text: "['h','e','l','l','o']", expected_text: "['o','l','l','e','h']" }],
          hidden_count: 2,
        },
      ],
      stages_count: 1,
      source: "fallback",
      status: "published",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];

  return fallback.map((problem) => normalizeProblem(problem, { source: "fallback" }));
}

export function buildAiGeneratedProblemDraft({ problemId, title, prompt, createdAt, updatedAt }) {
  return {
    id: problemId,
    slug: problemId,
    title,
    difficulty: 2,
    tags: ["ai-generated"],
    acceptance: 0,
    submissions: 0,
    statement_md: `## AI Generated Problem\n\nPrompt:\n${prompt}`,
    starter_code: {
      python: "def solve():\n    # Write your solution here\n    pass",
      javascript: "function solve() {\n  // Write your solution here\n}",
      typescript: "function solve(): void {\n}",
    },
    stages: [
      {
        id: `${problemId}-stage-1`,
        stage_index: 1,
        prompt_md: "Implement the requested solution.",
        visible_tests: [],
        hidden_count: 0,
      },
    ],
    stages_count: 1,
    status: "draft",
    source: "ai",
    last_generated_prompt: prompt,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

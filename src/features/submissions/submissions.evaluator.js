import { hashString } from "../../utils/hash.js";

export function evaluateStage(code, stage) {
  const normalizedCode = String(code || "").trim();
  const signature = hashString(`${stage.id}|${normalizedCode}`);
  const tooShort = normalizedCode.length < 24;
  const placeholder = /\b(pass|todo|write your solution here)\b/i.test(normalizedCode);
  const passed = !tooShort && !placeholder && signature % 100 >= 28;

  const visibleTests = Array.isArray(stage.visible_tests) ? stage.visible_tests : [];
  const failingIndex = visibleTests.length ? signature % visibleTests.length : -1;

  const visibleResults = visibleTests.map((test, index) => {
    const testPassed = passed ? true : index !== failingIndex;
    return {
      input_text: test.input_text,
      expected_text: test.expected_text,
      passed: testPassed,
      error: testPassed ? null : "Output mismatch",
    };
  });

  return {
    passed,
    runtime_ms: 12 + (signature % 180),
    stage_score: passed ? Math.max(55, 100 - (signature % 22)) : Math.max(8, 30 - (signature % 15)),
    visible_results: visibleResults,
  };
}

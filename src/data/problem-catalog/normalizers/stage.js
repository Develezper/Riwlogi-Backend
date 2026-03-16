import { clampInt, cleanString, decodeText } from "./common.js";
import { normalizeHiddenTests, normalizeTests, normalizeVisibleTests } from "./tests.js";

export function normalizeStage(problemId, rawStage, index) {
  const stageIndex = clampInt(rawStage?.stage_index, index + 1, { min: 1, max: 100 });
  const stageId = cleanString(rawStage?.id) || `${problemId || "problem"}-stage-${stageIndex}`;

  const tests = normalizeTests(rawStage?.tests);
  let visibleTests = normalizeVisibleTests(rawStage?.visible_tests);
  const hiddenTests = normalizeHiddenTests(rawStage?.hidden_tests);

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
      : [
          ...visibleTests.map((test) => ({
            input_text: test.input_text,
            expected_text: test.expected_text,
            is_hidden: false,
          })),
          ...hiddenTests.map((test) => ({
            input_text: test.input_text,
            expected_text: test.expected_text,
            is_hidden: true,
          })),
        ];

  const explicitHiddenCount = rawStage?.hidden_count;
  const hiddenCount = Number.isFinite(Number(explicitHiddenCount))
    ? clampInt(explicitHiddenCount, 0, { min: 0, max: 10000 })
    : Math.max(0, derivedTests.length - visibleTests.length);

  const normalizedHiddenTests = hiddenTests.length
    ? hiddenTests
    : derivedTests
        .filter((test) => test.is_hidden)
        .map((test) => ({
          input_text: test.input_text,
          expected_text: test.expected_text,
        }));

  return {
    id: stageId,
    stage_index: stageIndex,
    prompt_md: decodeText(rawStage?.prompt_md) || `Solve stage ${stageIndex}.`,
    time_limit_ms: clampInt(rawStage?.time_limit_ms, 0, { min: 0, max: 20000 }),
    tests: derivedTests,
    visible_tests: visibleTests,
    hidden_count: hiddenCount,
    hidden_tests: normalizedHiddenTests,
  };
}

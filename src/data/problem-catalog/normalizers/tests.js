import { decodeText } from "./common.js";

function normalizeTestPairs(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((test) => ({
      input_text: decodeText(test?.input_text),
      expected_text: decodeText(test?.expected_text),
    }))
    .filter((test) => test.input_text && test.expected_text);
}

export function normalizeVisibleTests(value) {
  return normalizeTestPairs(value);
}

export function normalizeHiddenTests(value) {
  return normalizeTestPairs(value);
}

export function normalizeTests(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((test) => ({
      input_text: decodeText(test?.input_text),
      expected_text: decodeText(test?.expected_text),
      is_hidden: Boolean(test?.is_hidden),
    }))
    .filter((test) => test.input_text && test.expected_text);
}

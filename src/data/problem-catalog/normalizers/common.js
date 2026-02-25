export function decodeText(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\\n/g, "\n").trim();
}

export function clampInt(
  value,
  fallback,
  { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {},
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  const rounded = Math.round(parsed);
  if (rounded < min || rounded > max) return fallback;
  return rounded;
}

export function cleanString(value) {
  return String(value || "").trim();
}

function sanitizeStarterCode(raw = "") {
  return decodeText(raw)
    .replace(/^\s*\*\s*@backend\/.*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

export function normalizeStarterCode(starterCode = {}) {
  const normalized = {};

  Object.entries(starterCode).forEach(([language, snippet]) => {
    const key = cleanString(language).toLowerCase();
    if (!key) return;
    normalized[key] = sanitizeStarterCode(String(snippet || ""));
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

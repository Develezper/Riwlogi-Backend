import { beforeEach, describe, expect, it } from "bun:test";
import { resetProblemCatalog } from "../src/data/problem-catalog.js";
import { getProblem } from "../src/features/problems/problems.service.js";

beforeEach(() => {
  resetProblemCatalog();
});

describe("problems public payload", () => {
  it("does not expose private tests and returns a single stage", () => {
    const problem = getProblem("two-sum");

    expect(problem).not.toBeNull();
    expect(Array.isArray(problem.stages)).toBe(true);
    expect(problem.stages.length).toBe(1);

    problem.stages.forEach((stage) => {
      expect(Object.prototype.hasOwnProperty.call(stage, "tests")).toBe(false);
      expect(Array.isArray(stage.visible_tests)).toBe(true);
      expect(stage.stage_index).toBe(1);
    });
  });
});

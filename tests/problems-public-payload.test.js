import { beforeEach, describe, expect, it } from "bun:test";
import { resetProblemCatalog } from "../src/data/problem-catalog.js";
import {
  generateAdminProblem,
  updateAdminProblem,
} from "../src/features/admin/admin.service.js";
import { getProblem, listProblems, listTags } from "../src/features/problems/problems.service.js";
import { HttpError } from "../src/utils/http-error.js";

beforeEach(() => {
  return resetProblemCatalog();
});

describe("problems public payload", () => {
  it("does not expose private tests and returns a single stage", async () => {
    const problem = await getProblem("two-sum");

    expect(problem).not.toBeNull();
    expect(Array.isArray(problem.stages)).toBe(true);
    expect(problem.stages.length).toBe(1);

    problem.stages.forEach((stage) => {
      expect(Object.prototype.hasOwnProperty.call(stage, "tests")).toBe(false);
      expect(Array.isArray(stage.visible_tests)).toBe(true);
      expect(stage.stage_index).toBe(1);
    });
  });

  it("lists only published problems by default", async () => {
    const generated = await generateAdminProblem({
      prompt: "Create a queue challenge with easy constraints.",
    });

    const listed = await listProblems();
    expect(listed.some((problem) => problem.id === generated.id)).toBe(false);

    await updateAdminProblem({
      problemId: generated.id,
      updates: { status: "published" },
    });

    const listedAfterPublish = await listProblems();
    expect(listedAfterPublish.some((problem) => problem.id === generated.id)).toBe(true);

    const draftQuery = await listProblems({ status: "draft" });
    expect(draftQuery.some((problem) => problem.id === generated.id)).toBe(false);
  });

  it("accepts spanish status labels as published", async () => {
    const generated = await generateAdminProblem({
      prompt: "Create an easy queue problem with two examples.",
    });

    await updateAdminProblem({
      problemId: generated.id,
      updates: { status: "publicado" },
    });

    const listed = await listProblems({ status: "published" });
    expect(listed.some((problem) => problem.id === generated.id)).toBe(true);
  });

  it("blocks direct access to non-published problem details", async () => {
    const generated = await generateAdminProblem({
      prompt: "Create a stack challenge with one visible test.",
    });

    try {
      await getProblem(generated.slug);
      throw new Error("Expected getProblem to fail for draft status");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect(error.status).toBe(404);
    }
  });

  it("only returns tags from published problems", async () => {
    const generated = await generateAdminProblem({
      prompt: "Create an easy problem about deques and windows.",
    });

    await updateAdminProblem({
      problemId: generated.id,
      updates: { tags: ["solo-draft-tag"] },
    });

    const tagsBefore = await listTags();
    expect(tagsBefore.includes("solo-draft-tag")).toBe(false);

    await updateAdminProblem({
      problemId: generated.id,
      updates: { status: "published" },
    });

    const tagsAfter = await listTags();
    expect(tagsAfter.includes("solo-draft-tag")).toBe(true);
  });
});

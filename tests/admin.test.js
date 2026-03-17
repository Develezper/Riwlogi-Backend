import { beforeEach, describe, expect, it } from "bun:test";
import { resetProblemCatalog } from "../src/data/problem-catalog.js";
import { store } from "../src/data/store.js";
import {
  deleteAdminProblem,
  deleteAdminUser,
  generateAdminProblem,
  listAdminProblems,
  updateAdminProblem,
} from "../src/features/admin/admin.service.js";
import { HttpError } from "../src/utils/http-error.js";

beforeEach(() => {
  return Promise.all([store.reset(), resetProblemCatalog()]);
});

describe("admin services", () => {
  it("lists admin problems ordered by most recent update", async () => {
    const first = await generateAdminProblem({
      prompt: "Create a queue challenge for beginners.",
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const second = await generateAdminProblem({
      prompt: "Create a stack challenge for beginners.",
    });

    const initialList = await listAdminProblems();
    const firstInitialIndex = initialList.findIndex((problem) => problem.id === first.id);
    const secondInitialIndex = initialList.findIndex((problem) => problem.id === second.id);

    expect(firstInitialIndex).toBeGreaterThanOrEqual(0);
    expect(secondInitialIndex).toBeGreaterThanOrEqual(0);
    expect(secondInitialIndex).toBeLessThan(firstInitialIndex);

    await updateAdminProblem({
      problemId: first.id,
      updates: {
        difficulty: 3,
      },
    });

    const updatedList = await listAdminProblems();
    const firstUpdatedIndex = updatedList.findIndex((problem) => problem.id === first.id);
    const secondUpdatedIndex = updatedList.findIndex((problem) => problem.id === second.id);

    expect(firstUpdatedIndex).toBeGreaterThanOrEqual(0);
    expect(secondUpdatedIndex).toBeGreaterThanOrEqual(0);
    expect(firstUpdatedIndex).toBeLessThan(secondUpdatedIndex);
  });

  it("persists generated problems and supports update/delete", async () => {
    const generated = await generateAdminProblem({
      prompt: "Create a graph traversal challenge for intermediate developers.",
    });

    const listedAfterCreate = (await listAdminProblems()).find((problem) => problem.id === generated.id);
    expect(listedAfterCreate).toBeDefined();

    const updated = await updateAdminProblem({
      problemId: generated.id,
      updates: {
        difficulty: 3,
        tags: ["graphs", "dfs"],
        status: "published",
      },
    });

    expect(updated.difficulty).toBe(3);
    expect(updated.status).toBe("published");
    expect(updated.tags.includes("graphs")).toBe(true);

    const deleted = await deleteAdminProblem({ problemId: generated.id });
    expect(deleted.ok).toBe(true);

    const listedAfterDelete = (await listAdminProblems()).find((problem) => problem.id === generated.id);
    expect(listedAfterDelete).toBeUndefined();
  });

  it("collapses stages_json to a single stage in admin update payload", async () => {
    const generated = await generateAdminProblem({
      prompt: "Create a string problem with visible tests.",
    });

    const updated = await updateAdminProblem({
      problemId: generated.id,
      updates: {
        stages_json: JSON.stringify([
          {
            stage_index: 1,
            prompt_md: "Stage 1 prompt",
            hidden_count: 2,
            visible_tests: [{ input_text: "abc", expected_text: "cba" }],
          },
          {
            stage_index: 2,
            prompt_md: "Stage 2 prompt",
            hidden_count: 3,
            visible_tests: [{ input_text: "level", expected_text: "true" }],
          },
        ]),
      },
    });

    expect(updated.stages_count).toBe(1);
    expect(updated.stages.length).toBe(1);
    expect(updated.stages[0].prompt_md).toBe("Stage 1 prompt");
    expect(updated.stages[0].hidden_count).toBe(2);
  });

  it("prevents deleting yourself as admin", async () => {
    const admin = await store.findUserByIdentifier("admin@riwlogi.dev");

    try {
      await deleteAdminUser({
        userId: admin.id,
        requestedByUserId: admin.id,
      });
      throw new Error("Expected deleteAdminUser to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect(error.status).toBe(400);
    }
  });
});

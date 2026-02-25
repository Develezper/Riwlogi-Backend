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
  it("persists generated problems and supports update/delete", () => {
    const generated = generateAdminProblem({
      prompt: "Create a graph traversal challenge for intermediate developers.",
    });

    const listedAfterCreate = listAdminProblems().find((problem) => problem.id === generated.id);
    expect(listedAfterCreate).toBeDefined();

    const updated = updateAdminProblem({
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

    const deleted = deleteAdminProblem({ problemId: generated.id });
    expect(deleted.ok).toBe(true);

    const listedAfterDelete = listAdminProblems().find((problem) => problem.id === generated.id);
    expect(listedAfterDelete).toBeUndefined();
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

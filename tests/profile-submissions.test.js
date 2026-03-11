import { beforeEach, describe, expect, it } from "bun:test";
import { resetProblemCatalog } from "../src/data/problem-catalog.js";
import { store } from "../src/data/store.js";
import { getProfile } from "../src/features/profile/profile.service.js";
import {
  sendSubmissionEvents,
  startSubmission,
} from "../src/features/submissions/submissions.service.js";
import { HttpError } from "../src/utils/http-error.js";

beforeEach(() => {
  return Promise.all([store.reset(), resetProblemCatalog()]);
});

describe("profile and submissions", () => {
  it("returns streak 0 when user has no activity today", async () => {
    const demoUser = await store.findUserByIdentifier("demo@riwlogi.dev");
    const profile = await getProfile(demoUser.id);

    expect(profile.streak).toBe(0);
  });

  it("returns 404 when sending events to an unknown submission", async () => {
    const demoUser = await store.findUserByIdentifier("demo@riwlogi.dev");

    try {
      await sendSubmissionEvents({
        userId: demoUser.id,
        submissionId: "sub_missing",
        events: [{ type: "key", char_count: 10 }],
      });
      throw new Error("Expected sendSubmissionEvents to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect(error.status).toBe(404);
    }
  });

  it("caps submission events growth", async () => {
    const demoUser = await store.findUserByIdentifier("demo@riwlogi.dev");
    const started = await startSubmission({
      userId: demoUser.id,
      problemId: "two-sum",
      language: "python",
    });

    const events = Array.from({ length: 200 }, () => ({
      type: "key",
      char_count: 1,
      timestamp: new Date().toISOString(),
    }));

    for (let index = 0; index < 20; index += 1) {
      await sendSubmissionEvents({
        userId: demoUser.id,
        submissionId: started.submission_id,
        events,
      });
    }

    const submission = await store.findSubmissionByOwner(started.submission_id, demoUser.id);
    expect(submission).not.toBeNull();
    expect(submission.events.length).toBeLessThanOrEqual(2000);
  });
});

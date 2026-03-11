import { uid } from "../../utils/id.js";
import { nowIso } from "../../utils/time.js";
import { toId } from "./utils.js";

export const submissionStoreMethods = {
  createSubmission({ user_id, problem_id, problem_title, language }) {
    const submission = {
      id: uid("sub"),
      user_id: toId(user_id),
      problem_id: toId(problem_id),
      problem_title: String(problem_title || ""),
      language: String(language || "python").toLowerCase(),
      code: "",
      stage_results: {},
      runtime_ms: 0,
      final_score: 0,
      verdict: "pending",
      events: [],
      created_at: nowIso(),
      updated_at: nowIso(),
      submitted_at: null,
    };

    this.submissions.push(submission);
    this.submissionById.set(submission.id, submission);

    if (!this.submissionIdsByUser.has(submission.user_id)) {
      this.submissionIdsByUser.set(submission.user_id, new Set());
    }
    this.submissionIdsByUser.get(submission.user_id).add(submission.id);

    return submission;
  },

  findSubmission(submissionId) {
    const normalized = toId(submissionId);
    if (!normalized) return null;
    return this.submissionById.get(normalized) || null;
  },

  findSubmissionByOwner(submissionId, userId) {
    const submission = this.findSubmission(submissionId);
    if (!submission) return null;
    return submission.user_id === toId(userId) ? submission : null;
  },

  updateSubmission(submissionId, updates = {}) {
    const submission = this.findSubmission(submissionId);
    if (!submission) return null;

    submission.code = String(updates.code ?? submission.code ?? "");
    submission.stage_results =
      updates.stage_results && typeof updates.stage_results === "object"
        ? updates.stage_results
        : submission.stage_results || {};
    submission.runtime_ms = Number(updates.runtime_ms ?? submission.runtime_ms ?? 0);
    submission.final_score = Number(updates.final_score ?? submission.final_score ?? 0);
    submission.verdict = String(updates.verdict ?? submission.verdict ?? "pending");
    submission.events = Array.isArray(updates.events) ? updates.events : submission.events || [];
    submission.updated_at = String(updates.updated_at || nowIso());
    submission.submitted_at = updates.submitted_at ?? submission.submitted_at ?? null;

    return submission;
  },

  listSubmissions() {
    return this.submissions.slice();
  },

  listSubmissionsByUser(userId) {
    const normalized = toId(userId);
    const ids = this.submissionIdsByUser.get(normalized);
    if (!ids || ids.size === 0) return [];

    return [...ids].map((id) => this.submissionById.get(id)).filter(Boolean);
  },

  deleteSubmissionsByUser(userId) {
    const normalized = toId(userId);
    if (!normalized) return 0;

    const ids = this.submissionIdsByUser.get(normalized);
    if (!ids || ids.size === 0) return 0;

    const idSet = new Set(ids);
    this.submissions = this.submissions.filter((submission) => !idSet.has(submission.id));
    idSet.forEach((submissionId) => this.submissionById.delete(submissionId));
    this.submissionIdsByUser.delete(normalized);
    return idSet.size;
  },
};

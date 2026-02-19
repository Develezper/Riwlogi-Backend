import { nowIso } from "../../utils/time.js";

export function toAdminUser(user, submissionsByUser) {
  const userSubmissions = submissionsByUser.get(user.id) || [];
  const accepted = new Set(
    userSubmissions
      .filter((submission) => submission.verdict === "accepted")
      .map((submission) => submission.problem_id),
  );

  const lastActivity = userSubmissions
    .map((submission) => new Date(submission.submitted_at || submission.created_at).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0];

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role || "user",
    is_admin: user.role === "admin",
    display_name: user.display_name || user.username,
    created_at: user.created_at,
    submissions_count: userSubmissions.length,
    solved_count: accepted.size,
    last_active_at: Number.isFinite(lastActivity) ? new Date(lastActivity).toISOString() : null,
  };
}

export function toAdminProblem(problem) {
  return {
    ...problem,
    status: problem.status || "published",
    source: problem.source || "custom",
    ai_generated: problem.source === "ai",
    created_at: problem.created_at || nowIso(),
    updated_at: problem.updated_at || nowIso(),
    last_generated_prompt: problem.last_generated_prompt || "",
  };
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

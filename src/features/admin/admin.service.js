import {
  createProblem,
  deleteProblem,
  getAllProblems,
  getProblemBySlug,
  updateProblem,
} from "../../data/problem-catalog.js";
import { store } from "../../data/store.js";
import { HttpError } from "../../utils/http-error.js";
import { nowIso } from "../../utils/time.js";
import { slugify, toAdminProblem, toAdminUser } from "./admin.formatters.js";
import { buildAiGeneratedProblemDraft } from "./admin.problem-factory.js";
import { normalizeGenerationPrompt, sanitizeProblemUpdates } from "./admin.validation.js";

function ensureUniqueProblemId(baseId) {
  const normalizedBase = slugify(baseId) || `problem-${Date.now()}`;
  let candidate = normalizedBase;
  let index = 2;

  while (getProblemBySlug(candidate)) {
    candidate = `${normalizedBase}-${index}`;
    index += 1;
  }

  return candidate;
}

export function getAdminOverview() {
  const users = store.listUsers();
  const submissions = store.listSubmissions();
  const problems = getAllProblems();

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activeUsers = new Set(
    submissions
      .filter((submission) => {
        const timestamp = new Date(submission.submitted_at || submission.created_at).getTime();
        return Number.isFinite(timestamp) && timestamp > sevenDaysAgo;
      })
      .map((submission) => submission.user_id),
  );

  const acceptedCount = submissions.filter((submission) => submission.verdict === "accepted").length;
  const acceptanceRate = submissions.length > 0 ? (acceptedCount / submissions.length) * 100 : 0;

  const tagCounts = new Map();
  problems.forEach((problem) => {
    (problem.tags || []).forEach((tag) => {
      const key = String(tag || "").trim();
      if (!key) return;
      tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
    });
  });

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  const recentActivity = submissions
    .slice()
    .sort(
      (a, b) =>
        new Date(b.submitted_at || b.created_at).getTime() -
        new Date(a.submitted_at || a.created_at).getTime(),
    )
    .slice(0, 20)
    .map((submission, index) => ({
      id: submission.id || `activity_${index}`,
      type: submission.verdict === "accepted" ? "submission_accepted" : "submission",
      label: `${submission.problem_title} by user ${submission.user_id}`,
      created_at: submission.submitted_at || submission.created_at,
    }));

  const aiGeneratedProblems = problems.filter((problem) => problem.source === "ai").length;
  const draftProblems = problems.filter((problem) => problem.status === "draft").length;

  return {
    kpis: {
      total_users: users.length,
      active_users_7d: activeUsers.size,
      total_problems: problems.length,
      published_problems: problems.length - draftProblems,
      draft_problems: draftProblems,
      total_submissions: submissions.length,
      accepted_submissions: acceptedCount,
      acceptance_rate: Number(acceptanceRate.toFixed(1)),
      ai_generated_problems: aiGeneratedProblems,
    },
    top_tags: topTags,
    recent_activity: recentActivity,
    updated_at: nowIso(),
  };
}

export function listAdminUsers() {
  const users = store.listUsers();
  const submissions = store.listSubmissions();

  const submissionsByUser = new Map();
  submissions.forEach((submission) => {
    if (!submissionsByUser.has(submission.user_id)) {
      submissionsByUser.set(submission.user_id, []);
    }
    submissionsByUser.get(submission.user_id).push(submission);
  });

  return users.map((user) => toAdminUser(user, submissionsByUser));
}

export function deleteAdminUser({ userId, requestedByUserId }) {
  const targetUser = store.findUserById(userId);
  if (!targetUser) {
    throw new HttpError(404, "Usuario no encontrado.");
  }

  if (String(requestedByUserId || "") === targetUser.id) {
    throw new HttpError(400, "No puedes eliminar tu propio usuario administrador.");
  }

  if (targetUser.role === "admin" && store.countAdmins() <= 1) {
    throw new HttpError(400, "No puedes eliminar el ultimo administrador.");
  }

  const deleted = store.deleteUser(targetUser.id);
  if (!deleted) {
    throw new HttpError(500, "No se pudo eliminar el usuario.");
  }

  return {
    ok: true,
    deleted_user_id: targetUser.id,
  };
}

export function listAdminProblems() {
  return getAllProblems().map(toAdminProblem);
}

export function generateAdminProblem({ prompt }) {
  const cleanPrompt = normalizeGenerationPrompt(prompt);

  const titleSource = cleanPrompt.split(/[.!?\n]/)[0] || "AI Generated Problem";
  const title = titleSource.slice(0, 90);
  const baseId = slugify(title) || "ai-generated-problem";
  const problemId = ensureUniqueProblemId(baseId.startsWith("ai-") ? baseId : `ai-${baseId}`);

  const timestamp = nowIso();
  const createdProblem = createProblem(
    buildAiGeneratedProblemDraft({
      problemId,
      title,
      prompt: cleanPrompt,
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  );

  return toAdminProblem(createdProblem);
}

export function updateAdminProblem({ problemId, updates }) {
  const sanitizedUpdates = sanitizeProblemUpdates(updates);
  const updated = updateProblem(problemId, sanitizedUpdates);
  return toAdminProblem(updated);
}

export function deleteAdminProblem({ problemId }) {
  const removed = deleteProblem(problemId);
  return {
    ok: true,
    deleted_problem_id: removed.id,
  };
}

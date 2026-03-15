import {
  createProblem,
  deleteProblem,
  getAllProblems,
  getProblemBySlug,
  updateProblem,
} from "../../data/problem-catalog.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { store } from "../../data/store.js";
import { HttpError } from "../../utils/http-error.js";
import { nowIso } from "../../utils/time.js";
import {
  requestClassifierApi,
  trimTrailingSlash,
} from "../classifier/classifier-client.js";
import { slugify, toAdminProblem, toAdminUser } from "./admin.formatters.js";
import { buildAiGeneratedProblemDraft } from "./admin.problem-factory.js";
import { normalizeGenerationPrompt, sanitizeProblemUpdates } from "./admin.validation.js";

const TEMPLATE_MARKERS = [
  "instrucciones internas para esta generaci",
  "## ai generated problem",
  "solve the problem using the function",
  "example_input_stage_",
  "example_output_stage_",
  "write your solution here",
];

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function canonicalStatus(value) {
  const status = normalizeStatus(value);
  if (status === "publicado") return "published";
  if (status === "borrador") return "draft";
  if (status === "archivado") return "archived";
  if (status === "pendiente") return "pending";
  return status;
}

function isPublishedStatus(value) {
  return canonicalStatus(value) === "published";
}

function isSubmittedSubmission(submission) {
  const verdict = normalizeStatus(submission?.verdict);
  if (verdict && verdict !== "pending") return true;
  const submittedAt = new Date(submission?.submitted_at).getTime();
  return Number.isFinite(submittedAt) && submittedAt > 0;
}

function getSolveDurationMs(submission) {
  const createdAt = new Date(submission?.created_at).getTime();
  const submittedAt = new Date(submission?.submitted_at).getTime();
  if (!Number.isFinite(createdAt) || !Number.isFinite(submittedAt)) return null;
  if (submittedAt < createdAt) return null;
  return submittedAt - createdAt;
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const total = values.reduce((acc, value) => acc + Number(value || 0), 0);
  return total / values.length;
}

function formatDurationShort(durationMs) {
  const ms = Number(durationMs);
  if (!Number.isFinite(ms) || ms <= 0) return null;

  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function normalizeComparableText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function containsTemplateMarker(value) {
  const normalized = normalizeComparableText(value);
  if (!normalized) return false;
  return TEMPLATE_MARKERS.some((marker) => normalized.includes(marker));
}

function detectGeneratedPayloadIssue(payload, prompt) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "respuesta invalida del generador";
  }

  const normalizedPrompt = normalizeComparableText(prompt);
  const normalizedTitle = normalizeComparableText(payload.title);
  if (normalizedPrompt && normalizedTitle && normalizedPrompt === normalizedTitle) {
    return "titulo copia el prompt";
  }

  const statement = String(payload.statement_md || "");
  if (statement.trim().length < 24 || containsTemplateMarker(statement)) {
    return "enunciado de plantilla";
  }

  const stages = Array.isArray(payload.stages) ? payload.stages : [];
  if (!stages.length) {
    return "faltan etapas";
  }

  const visibleTests = Array.isArray(stages[0]?.visible_tests) ? stages[0].visible_tests : [];
  if (!visibleTests.length) {
    return "faltan tests visibles";
  }

  for (const test of visibleTests) {
    if (containsTemplateMarker(test?.input_text) || containsTemplateMarker(test?.expected_text)) {
      return "tests de plantilla";
    }
  }

  return null;
}

function buildFallbackGeneratedPayload(prompt) {
  const cleanPrompt = String(prompt || "").trim();
  const titleBase = cleanPrompt.split(/[.!?\n]/)[0] || "AI Generated Problem";
  const title = `${titleBase} Challenge`.slice(0, 90);

  return {
    title,
    difficulty: 2,
    tags: ["algorithms"],
    statement_md: [
      "## Description",
      "",
      cleanPrompt || "Solve the proposed algorithmic challenge.",
      "",
      "## Requirements",
      "- Write a correct and efficient solution.",
      "- Handle edge cases.",
    ].join("\n"),
    starter_code: {
      python: "def solve(data):\n    # Write your solution here\n    pass",
      javascript: "function solve(data) {\n  // Write your solution here\n}",
    },
    stages: [
      {
        stage_index: 1,
        prompt_md: "Solve the complete problem in one stage.",
        hidden_count: 1,
        visible_tests: [
          { input_text: "sample input", expected_text: "sample output" },
        ],
      },
    ],
  };
}

async function ensureUniqueProblemId(baseId) {
  const normalizedBase = slugify(baseId) || `problem-${Date.now()}`;
  let candidate = normalizedBase;
  let index = 2;

  while (await getProblemBySlug(candidate)) {
    candidate = `${normalizedBase}-${index}`;
    index += 1;
  }

  return candidate;
}

async function generateProblemWithAi(prompt) {
  if (!env.CLASSIFIER_API_BASE) return null;

  const baseUrl = trimTrailingSlash(env.CLASSIFIER_API_BASE);
  if (!baseUrl) return null;

  try {
    const response = await requestClassifierApi({
      operationName: "generate_admin_problem",
      method: "POST",
      url: `${baseUrl}/generate-problem`,
      data: { prompt },
      timeout: Math.max(30_000, env.CLASSIFIER_API_TIMEOUT_MS),
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      const upstreamMessage =
        response.data && typeof response.data === "object"
          ? response.data.message || response.data.detail || response.data.error
          : null;

      logger.warn(
        { status: response.status, data: response.data },
        "AI problem generation endpoint returned non-2xx response",
      );

      throw new HttpError(
        503,
        "La generacion con IA no esta disponible. Revisa OPENAI_API_KEY en el servicio api.",
        upstreamMessage ? { upstream_message: String(upstreamMessage) } : null,
      );
    }

    if (!response.data || typeof response.data !== "object" || Array.isArray(response.data)) {
      logger.warn("AI problem generation returned invalid payload shape.");
      return null;
    }

    return response.data;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    logger.warn({ err: error }, "AI problem generation request failed.");
    throw new HttpError(
      503,
      "No se pudo conectar con el servicio de generacion IA.",
      error instanceof Error ? { reason: error.message } : null,
    );
  }
}

export async function getAdminOverview() {
  const [users, submissions, problems] = await Promise.all([
    store.listUsers(),
    store.listSubmissions(),
    getAllProblems(),
  ]);

  const submittedSubmissions = submissions.filter(isSubmittedSubmission);
  const acceptedSubmissions = submittedSubmissions.filter(
    (submission) => normalizeStatus(submission.verdict) === "accepted",
  );

  const userNameById = new Map(
    users.map((user) => [
      String(user.id || ""),
      String(user.display_name || user.username || user.id || "Usuario").trim() || "Usuario",
    ]),
  );

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activeUsers = new Set(
    submittedSubmissions
      .filter((submission) => {
        const timestamp = new Date(submission.submitted_at || submission.created_at).getTime();
        return Number.isFinite(timestamp) && timestamp > sevenDaysAgo;
      })
      .map((submission) => submission.user_id),
  );

  const acceptedCount = acceptedSubmissions.length;
  const acceptanceRate =
    submittedSubmissions.length > 0 ? (acceptedCount / submittedSubmissions.length) * 100 : 0;
  const acceptedSolveDurations = acceptedSubmissions
    .map(getSolveDurationMs)
    .filter((value) => Number.isFinite(value) && value >= 0);
  const averageResolutionTimeMs = Math.round(average(acceptedSolveDurations));

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

  const recentActivity = submittedSubmissions
    .slice()
    .sort(
      (a, b) =>
        new Date(b.submitted_at || b.created_at).getTime() -
        new Date(a.submitted_at || a.created_at).getTime(),
    )
    .slice(0, 20)
    .map((submission, index) => {
      const actorName =
        userNameById.get(String(submission.user_id || "")) || String(submission.user_id || "Usuario");
      const durationText = formatDurationShort(getSolveDurationMs(submission));
      const baseLabel = `${submission.problem_title} - ${actorName}`;
      return {
        id: submission.id || `activity_${index}`,
        type: submission.verdict === "accepted" ? "submission_accepted" : "submission",
        label: durationText ? `${baseLabel} (${durationText})` : baseLabel,
        created_at: submission.submitted_at || submission.created_at,
      };
    });

  const aiGeneratedProblems = problems.filter((problem) => problem.source === "ai").length;
  const publishedProblems = problems.filter((problem) => isPublishedStatus(problem.status)).length;

  return {
    kpis: {
      total_users: users.length,
      active_users_7d: activeUsers.size,
      total_problems: problems.length,
      published_problems: publishedProblems,
      draft_problems: problems.filter((problem) => canonicalStatus(problem.status) === "draft").length,
      total_submissions: submittedSubmissions.length,
      accepted_submissions: acceptedCount,
      acceptance_rate: Number(acceptanceRate.toFixed(1)),
      ai_generated_problems: aiGeneratedProblems,
      avg_resolution_time_ms: averageResolutionTimeMs,
    },
    top_tags: topTags,
    recent_activity: recentActivity,
    updated_at: nowIso(),
  };
}

export async function listAdminUsers() {
  const [users, submissions] = await Promise.all([store.listUsers(), store.listSubmissions()]);
  const submittedSubmissions = submissions.filter(isSubmittedSubmission);

  const submissionsByUser = new Map();
  submittedSubmissions.forEach((submission) => {
    if (!submissionsByUser.has(submission.user_id)) {
      submissionsByUser.set(submission.user_id, []);
    }
    submissionsByUser.get(submission.user_id).push(submission);
  });

  return users.map((user) => toAdminUser(user, submissionsByUser));
}

export async function deleteAdminUser({ userId, requestedByUserId }) {
  const targetUser = await store.findUserById(userId);
  if (!targetUser) {
    throw new HttpError(404, "Usuario no encontrado.");
  }

  if (String(requestedByUserId || "") === targetUser.id) {
    throw new HttpError(400, "No puedes eliminar tu propio usuario administrador.");
  }

  if (targetUser.role === "admin" && (await store.countAdmins()) <= 1) {
    throw new HttpError(400, "No puedes eliminar el ultimo administrador.");
  }

  const deleted = await store.deleteUser(targetUser.id);
  if (!deleted) {
    throw new HttpError(500, "No se pudo eliminar el usuario.");
  }

  return {
    ok: true,
    deleted_user_id: targetUser.id,
  };
}

export async function listAdminProblems() {
  const [problems, submissions] = await Promise.all([getAllProblems(), store.listSubmissions()]);
  const submittedSubmissions = submissions.filter(isSubmittedSubmission);

  const perProblem = new Map();

  for (const submission of submittedSubmissions) {
    const problemId = String(submission.problem_id || "").trim();
    if (!problemId) continue;

    if (!perProblem.has(problemId)) {
      perProblem.set(problemId, {
        total: 0,
        accepted: 0,
        durations: [],
      });
    }

    const stats = perProblem.get(problemId);
    stats.total += 1;

    if (normalizeStatus(submission.verdict) === "accepted") {
      stats.accepted += 1;
      const solveDuration = getSolveDurationMs(submission);
      if (Number.isFinite(solveDuration) && solveDuration >= 0) {
        stats.durations.push(solveDuration);
      }
    }
  }

  return problems.map((problem) => {
    const stats = perProblem.get(String(problem.id || "")) || {
      total: 0,
      accepted: 0,
      durations: [],
    };
    const acceptance = stats.total > 0 ? (stats.accepted / stats.total) * 100 : 0;
    const avgSolveTimeMs = stats.durations.length
      ? Math.round(average(stats.durations))
      : 0;
    const fastestSolveTimeMs = stats.durations.length ? Math.min(...stats.durations) : 0;

    return toAdminProblem({
      ...problem,
      submissions: stats.total,
      acceptance,
      accepted_submissions: stats.accepted,
      avg_solve_time_ms: avgSolveTimeMs,
      fastest_solve_time_ms: fastestSolveTimeMs,
    });
  });
}

export async function generateAdminProblem({ prompt }) {
  const cleanPrompt = normalizeGenerationPrompt(prompt);
  const generatedPayload = await generateProblemWithAi(cleanPrompt);

  const generatedTitle = String(generatedPayload?.title || "").trim();
  const titleSource = generatedTitle || cleanPrompt.split(/[.!?\n]/)[0] || "AI Generated Problem";
  const title = titleSource.slice(0, 90);
  const baseId = slugify(title) || "ai-generated-problem";
  const problemId = await ensureUniqueProblemId(baseId.startsWith("ai-") ? baseId : `ai-${baseId}`);

  const timestamp = nowIso();
  const createdProblem = await createProblem(
    buildAiGeneratedProblemDraft({
      problemId,
      title,
      prompt: cleanPrompt,
      createdAt: timestamp,
      updatedAt: timestamp,
      generated: generatedPayload,
    }),
  );

  return toAdminProblem(createdProblem);
}

export async function updateAdminProblem({ problemId, updates }) {
  const sanitizedUpdates = sanitizeProblemUpdates(updates);
  const updated = await updateProblem(problemId, sanitizedUpdates);
  return toAdminProblem(updated);
}

export async function deleteAdminProblem({ problemId }) {
  const removed = await deleteProblem(problemId);
  return {
    ok: true,
    deleted_problem_id: removed.id,
  };
}

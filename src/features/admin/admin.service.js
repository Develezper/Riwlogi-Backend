import {
  createProblem,
  deleteProblem,
  getAllProblems,
  getProblemBySlug,
  updateProblem,
} from "../../data/problem-catalog.js";
import { env } from "../../config/env.js";
import { httpClient } from "../../config/http-client.js";
import { logger } from "../../config/logger.js";
import { store } from "../../data/store.js";
import { HttpError } from "../../utils/http-error.js";
import { nowIso } from "../../utils/time.js";
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

function trimTrailingSlash(value) {
  const text = String(value || "").trim();
  return text.endsWith("/") ? text.slice(0, -1) : text;
}

async function generateProblemWithAi(prompt) {
  if (env.NODE_ENV === "test") return null;
  if (!env.CLASSIFIER_API_BASE) return null;

  const baseUrl = trimTrailingSlash(env.CLASSIFIER_API_BASE);
  if (!baseUrl) return null;

  try {
    const response = await httpClient.post(
      `${baseUrl}/generate-problem`,
      { prompt },
      {
        timeout: 30_000,
        validateStatus: () => true,
      },
    );

    if (response.status < 200 || response.status >= 300) {
      logger.warn(
        { status: response.status, data: response.data },
        "AI problem generation endpoint returned non-2xx response",
      );
      return null;
    }

    if (!response.data || typeof response.data !== "object" || Array.isArray(response.data)) {
      logger.warn("AI problem generation returned invalid payload shape.");
      return null;
    }

    return response.data;
  } catch (error) {
    logger.warn({ err: error }, "AI problem generation request failed.");
    return null;
  }
}

export async function getAdminOverview() {
  const [users, submissions, problems] = await Promise.all([
    store.listUsers(),
    store.listSubmissions(),
    getAllProblems(),
  ]);

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

export async function listAdminUsers() {
  const [users, submissions] = await Promise.all([store.listUsers(), store.listSubmissions()]);

  const submissionsByUser = new Map();
  submissions.forEach((submission) => {
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
  const problems = await getAllProblems();
  return problems.map(toAdminProblem);
}

export async function generateAdminProblem({ prompt }) {
  const cleanPrompt = normalizeGenerationPrompt(prompt);
  const generatedPayload = (await generateProblemWithAi(cleanPrompt)) || buildFallbackGeneratedPayload(cleanPrompt);

  const payloadIssue = detectGeneratedPayloadIssue(generatedPayload, cleanPrompt);
  if (payloadIssue) {
    throw new HttpError(502, `La IA devolvio contenido invalido: ${payloadIssue}.`);
  }

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

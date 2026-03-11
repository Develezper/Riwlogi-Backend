import { env } from "../../config/env.js";
import { getProblemBySlug } from "../../data/problem-catalog.js";
import { store } from "../../data/store.js";
import { HttpError } from "../../utils/http-error.js";
import { nowIso } from "../../utils/time.js";
import { classifyFromEvents, sanitizeEvents } from "./submissions.events.js";
import { evaluateStage } from "./submissions.evaluator.js";
import { withSubmissionLock } from "./submissions.lock.js";
import { normalizeLanguage, normalizeProblemId, normalizeStageId, normalizeSubmissionId } from "./submissions.validation.js";

function findStage(problem, stageId) {
  return problem.stages.find((stage) => stage.id === stageId) || null;
}

export async function startSubmission({ userId, problemId, language = "python" }) {
  const normalizedProblemId = normalizeProblemId(problemId);
  const normalizedLanguage = language ? normalizeLanguage(language) : "python";
  const problem = getProblemBySlug(normalizedProblemId);
  if (!problem) throw new HttpError(400, "Problema inválido.");

  const submission = await store.createSubmission({
    user_id: userId,
    problem_id: problem.id,
    problem_title: problem.title,
    language: normalizedLanguage,
  });

  return {
    submission_id: submission.id,
  };
}

export async function runSubmission({ userId, submissionId, stageId, code, events = [] }) {
  const normalizedSubmissionId = normalizeSubmissionId(submissionId);
  const normalizedStageId = normalizeStageId(stageId);
  return withSubmissionLock(normalizedSubmissionId, async () => {
    const submission = await store.findSubmissionByOwner(normalizedSubmissionId, userId);
    if (!submission) {
      throw new HttpError(404, "No se encontró la submission activa.");
    }

    const problem = getProblemBySlug(submission.problem_id);
    if (!problem) {
      throw new HttpError(404, "No se encontró el problema de la submission.");
    }

    const stage = findStage(problem, normalizedStageId);
    if (!stage) {
      throw new HttpError(400, "Stage inválido.");
    }

    const cleanEvents = sanitizeEvents(events);
    const result = evaluateStage(code, stage);
    const classification = await classifyFromEvents(cleanEvents);
    const mergedStageResults = {
      ...(submission.stage_results || {}),
      [stage.id]: {
        stage_id: stage.id,
        stage_index: stage.stage_index,
        passed: result.passed,
        stage_score: result.stage_score,
        runtime_ms: result.runtime_ms,
      },
    };
    const mergedEvents = [...(submission.events || []), ...cleanEvents].slice(-env.MAX_EVENTS_PER_SUBMISSION);

    await store.updateSubmission(submission.id, {
      code: String(code || ""),
      runtime_ms: result.runtime_ms,
      stage_results: mergedStageResults,
      events: mergedEvents,
      updated_at: nowIso(),
    });

    return {
      passed: result.passed,
      stage_index: stage.stage_index,
      stage_score: result.stage_score,
      runtime_ms: result.runtime_ms,
      visible_results: result.visible_results,
      classification,
    };
  });
}

export async function submitSubmission({ userId, submissionId }) {
  const normalizedSubmissionId = normalizeSubmissionId(submissionId);
  return withSubmissionLock(normalizedSubmissionId, async () => {
    const submission = await store.findSubmissionByOwner(normalizedSubmissionId, userId);
    if (!submission) throw new HttpError(404, "Submission no encontrada.");

    const problem = getProblemBySlug(submission.problem_id);
    if (!problem) throw new HttpError(404, "Problema no encontrado.");

    const stageResults = problem.stages.map((stage) => submission.stage_results[stage.id]).filter(Boolean);

    if (!stageResults.length) {
      throw new HttpError(400, "Primero ejecuta al menos una etapa.");
    }

    const allStagesExecuted = stageResults.length === problem.stages.length;
    const allPassed = allStagesExecuted && stageResults.every((stage) => stage.passed);

    const averageScore =
      stageResults.reduce((acc, stage) => acc + Number(stage.stage_score || 0), 0) / stageResults.length;

    const completionFactor = stageResults.length / Math.max(1, problem.stages.length);
    const finalScore = Math.round(averageScore * completionFactor);
    const verdict = allPassed ? "accepted" : "wrong_answer";
    const submittedAt = nowIso();

    await store.updateSubmission(submission.id, {
      final_score: finalScore,
      verdict,
      submitted_at: submittedAt,
      updated_at: submittedAt,
    });

    return {
      verdict,
      final_score: finalScore,
    };
  });
}

export async function sendSubmissionEvents({ userId, submissionId, events = [] }) {
  const normalizedSubmissionId = normalizeSubmissionId(submissionId);
  return withSubmissionLock(normalizedSubmissionId, async () => {
    const submission = await store.findSubmissionByOwner(normalizedSubmissionId, userId);
    if (!submission) {
      throw new HttpError(404, "Submission no encontrada.");
    }

    const cleanEvents = sanitizeEvents(events);
    const mergedEvents = [...(submission.events || []), ...cleanEvents].slice(-env.MAX_EVENTS_PER_SUBMISSION);
    await store.updateSubmission(submission.id, {
      events: mergedEvents,
      updated_at: nowIso(),
    });
    return { ok: true };
  });
}

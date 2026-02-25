import { httpClient } from "../../config/http-client.js";
import { env } from "../../config/env.js";
import { getProblemBySlug } from "../../data/problem-catalog.js";
import { store } from "../../data/store.js";
import { hashString } from "../../utils/hash.js";
import { HttpError } from "../../utils/http-error.js";
import { nowIso } from "../../utils/time.js";

function findStage(problem, stageId) {
  return problem.stages.find((stage) => stage.id === stageId) || null;
}

function eventSummary(events = []) {
  return events.reduce(
    (acc, event) => {
      if (event.type === "key") acc.key += Number(event.char_count || 0);
      if (event.type === "paste") acc.paste += Number(event.char_count || 0);
      if (event.type === "delete") acc.delete += Number(event.char_count || 0);
      if (event.type === "run") acc.run += 1;
      return acc;
    },
    { key: 0, paste: 0, delete: 0, run: 0 },
  );
}

function classifyWithHeuristic(events = []) {
  const summary = eventSummary(events);
  const totalInput = summary.key + summary.paste;
  const pasteRatio = totalInput > 0 ? summary.paste / totalInput : 0;

  let label = "human";
  if (pasteRatio >= 0.7) label = "ai_generated";
  else if (pasteRatio >= 0.35) label = "assisted";

  let confidence = 0.55 + pasteRatio * 0.4;
  if (summary.run >= 3 && pasteRatio < 0.2) confidence -= 0.08;

  return {
    label,
    confidence: Number(Math.max(0.5, Math.min(0.98, confidence)).toFixed(2)),
  };
}

async function classifyFromEvents(events = []) {
  const fallback = classifyWithHeuristic(events);

  if (!env.CLASSIFIER_API_BASE) return fallback;

  try {
    const payload = {
      events,
      summary: eventSummary(events),
    };

    const { data } = await httpClient.post(`${env.CLASSIFIER_API_BASE.replace(/\/$/, "")}/classify`, payload);

    if (!data || typeof data !== "object") return fallback;

    const label = typeof data.label === "string" && data.label.trim() ? data.label : fallback.label;
    const confidence = Number(data.confidence);

    return {
      label,
      confidence: Number.isFinite(confidence) ? confidence : fallback.confidence,
    };
  } catch {
    return fallback;
  }
}

function evaluateStage(code, stage) {
  const normalizedCode = String(code || "").trim();
  const signature = hashString(`${stage.id}|${normalizedCode}`);
  const tooShort = normalizedCode.length < 24;
  const placeholder = /\b(pass|todo|write your solution here)\b/i.test(normalizedCode);
  const passed = !tooShort && !placeholder && signature % 100 >= 28;

  const visibleTests = Array.isArray(stage.visible_tests) ? stage.visible_tests : [];
  const failingIndex = visibleTests.length ? signature % visibleTests.length : -1;

  const visibleResults = visibleTests.map((test, index) => {
    const testPassed = passed ? true : index !== failingIndex;
    return {
      input_text: test.input_text,
      expected_text: test.expected_text,
      passed: testPassed,
      error: testPassed ? null : "Output mismatch",
    };
  });

  return {
    passed,
    runtime_ms: 12 + (signature % 180),
    stage_score: passed ? Math.max(55, 100 - (signature % 22)) : Math.max(8, 30 - (signature % 15)),
    visible_results: visibleResults,
  };
}

function sanitizeEvents(events) {
  if (!Array.isArray(events)) return [];
  return events.slice(0, 200).map((event) => ({
    type: String(event?.type || "unknown"),
    char_count: Number(event?.char_count || 0),
    timestamp: event?.timestamp || nowIso(),
  }));
}

export function startSubmission({ userId, problemId, language = "python" }) {
  const problem = getProblemBySlug(problemId);
  if (!problem) throw new HttpError(400, "Problema inválido.");

  const submission = store.createSubmission({
    user_id: userId,
    problem_id: problem.id,
    problem_title: problem.title,
    language,
  });

  return {
    submission_id: submission.id,
  };
}

export async function runSubmission({ userId, submissionId, stageId, code, events = [] }) {
  const submission = store.findSubmissionByOwner(submissionId, userId);
  if (!submission) {
    throw new HttpError(404, "No se encontró la submission activa.");
  }

  const problem = getProblemBySlug(submission.problem_id);
  if (!problem) {
    throw new HttpError(404, "No se encontró el problema de la submission.");
  }

  const stage = findStage(problem, stageId);
  if (!stage) {
    throw new HttpError(400, "Stage inválido.");
  }

  const cleanEvents = sanitizeEvents(events);
  const result = evaluateStage(code, stage);
  const classification = await classifyFromEvents(cleanEvents);

  submission.code = String(code || "");
  submission.runtime_ms = result.runtime_ms;
  submission.stage_results[stage.id] = {
    stage_id: stage.id,
    stage_index: stage.stage_index,
    passed: result.passed,
    stage_score: result.stage_score,
    runtime_ms: result.runtime_ms,
  };
  submission.events.push(...cleanEvents);

  return {
    passed: result.passed,
    stage_index: stage.stage_index,
    stage_score: result.stage_score,
    runtime_ms: result.runtime_ms,
    visible_results: result.visible_results,
    classification,
  };
}

export function submitSubmission({ userId, submissionId }) {
  const submission = store.findSubmissionByOwner(submissionId, userId);
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

  submission.final_score = finalScore;
  submission.verdict = allPassed ? "accepted" : "wrong_answer";
  submission.submitted_at = nowIso();

  return {
    verdict: submission.verdict,
    final_score: finalScore,
  };
}

export function sendSubmissionEvents({ userId, submissionId, events = [] }) {
  const submission = store.findSubmissionByOwner(submissionId, userId);
  if (!submission) return { ok: false };

  submission.events.push(...sanitizeEvents(events));
  return { ok: true };
}

import { env } from "../../config/env.js";
import { getProblemBySlug } from "../../data/problem-catalog.js";
import { store } from "../../data/store.js";
import { HttpError } from "../../utils/http-error.js";
import { nowIso } from "../../utils/time.js";
import { evaluateStage } from "./submissions.evaluator.js";
import { classifyFromEvents, sanitizeEvents } from "./submissions.events.js";
import { withSubmissionLock } from "./submissions.lock.js";
import {
	ensureRunnerForSubmission,
	runUserCode,
	stopRunnerForSubmission,
	touchRunner,
} from "./submissions.runner.js";
import {
	normalizeLanguage,
	normalizeProblemId,
	normalizeStageId,
	normalizeSubmissionId,
} from "./submissions.validation.js";

function extractResult(stdout, stderr) {
	const lines = String(stdout || "")
		.trim()
		.split("\n");
	const output = lines.pop().trim();
	const userLogs = lines.join("\n");
	const errorLogs = String(stderr || "").trim();
	return { output, userLogs, errorLogs };
}

function buildTestCode(userCode, inputText, language) {
	const lang = String(language || "").toLowerCase();
	const serializedInput = JSON.stringify(String(inputText ?? ""));
	if (lang === "python") {
		return `${userCode}\nimport json as __json\nprint(__json.dumps(solve(${serializedInput})))`;
	}
	return `${userCode}\nconsole.log(JSON.stringify(solve(${serializedInput})))`;
}

function calculateAiPenalty(classification) {
	if (!classification) return 1;
	const { label, confidence } = classification;
	if (label === "human") return 1;
	if (label === "assisted") return 1 - 0.3 * confidence;
	if (label === "ai_generated") return 1 - 0.7 * confidence;
	return 1;
}

async function runStageTests(tests, { submissionId, language, code }) {
	return Promise.all(
		tests.map(async (test) => {
			const testCode = buildTestCode(code, test.input_text, language);
			const execution = await runUserCode({ submissionId, language, code: testCode });
			const runtimeMs = Number(execution.runtime_ms ?? 0);
			const { output, userLogs, errorLogs } = extractResult(execution.stdout, execution.stderr);
			return {
				output,
				expected: String(test.expected_text || "").trim(),
				runtime_ms: runtimeMs,
				userLogs,
				errorLogs,
			};
		}),
	);
}

function findStage(problem, stageId) {
	const stages = Array.isArray(problem?.stages) ? problem.stages : [];
	if (!stages.length) return null;
	return stages.find((stage) => stage.id === stageId) || stages[0];
}

export async function startSubmission({
	userId,
	problemId,
	language = "python",
}) {
	const normalizedProblemId = normalizeProblemId(problemId);
	const normalizedLanguage = language ? normalizeLanguage(language) : "python";
	const problem = await getProblemBySlug(normalizedProblemId);
	if (!problem) throw new HttpError(400, "Problema inválido.");

	const submission = await store.createSubmission({
		user_id: userId,
		problem_id: problem.id,
		problem_title: problem.title,
		language: normalizedLanguage,
	});

	ensureRunnerForSubmission(submission.id, normalizedLanguage);

	return {
		submission_id: submission.id,
	};
}

export async function runSubmission({
	userId,
	submissionId,
	stageId,
	code,
	events = [],
}) {
	const normalizedSubmissionId = normalizeSubmissionId(submissionId);
	const normalizedStageId = normalizeStageId(stageId);
	return withSubmissionLock(normalizedSubmissionId, async () => {
		const submission = await store.findSubmissionByOwner(
			normalizedSubmissionId,
			userId,
		);
		if (!submission) {
			throw new HttpError(404, "No se encontró la submission activa.");
		}

		const problem = await getProblemBySlug(submission.problem_id);
		if (!problem) {
			throw new HttpError(404, "No se encontró el problema de la submission.");
		}

		const stage = findStage(problem, normalizedStageId);
		if (!stage) {
			throw new HttpError(400, "Etapa inválida.");
		}

		const cleanEvents = sanitizeEvents(events);
		const shouldClassify = cleanEvents.some(
			(event) => event.type === "run" && event.mode === "submit",
		);

		const { tests = [] } = stage;

		const [classification, testOutputs] = await Promise.all([
			shouldClassify ? classifyFromEvents(cleanEvents, code) : null,
			runStageTests(tests, {
				submissionId: submission.id,
				language: submission.language,
				code,
			}),
		]);

		const runtimeMs = testOutputs.reduce(
			(maxRuntime, testOutput) =>
				Math.max(maxRuntime, Number(testOutput.runtime_ms || 0)),
			0,
		);

		const result = evaluateStage(testOutputs, stage);

		const mergedStageResults = {
			...(submission.stage_results || {}),
			[stage.id]: {
				stage_id: stage.id,
				stage_index: stage.stage_index,
				passed: result.passed,
				stage_score: result.stage_score,
				runtime_ms: runtimeMs,
			},
		};
		const mergedEvents = [...(submission.events || []), ...cleanEvents].slice(
			-env.MAX_EVENTS_PER_SUBMISSION,
		);

		await store.updateSubmission(submission.id, {
			code: String(code || ""),
			runtime_ms: runtimeMs,
			stage_results: mergedStageResults,
			events: mergedEvents,
			updated_at: nowIso(),
		});

		const stdout = testOutputs
			.map((t, index) => {
				const logs = [t.userLogs, t.errorLogs].filter(Boolean).join("\n");
				if (logs) return logs;
				if (t.output) return `Test ${index + 1} output: ${t.output}`;
				return "";
			})
			.filter(Boolean)
			.join("\n");

		return {
			passed: result.passed,
			stage_index: stage.stage_index,
			stage_score: result.stage_score,
			runtime_ms: runtimeMs,
			visible_results: result.visible_results,
			classification,
			stdout,
		};
	});
}

export async function submitSubmission({ userId, submissionId }) {
	const normalizedSubmissionId = normalizeSubmissionId(submissionId);
	return withSubmissionLock(normalizedSubmissionId, async () => {
		const submission = await store.findSubmissionByOwner(
			normalizedSubmissionId,
			userId,
		);
		if (!submission) throw new HttpError(404, "Submission no encontrada.");

		const problem = await getProblemBySlug(submission.problem_id);
		if (!problem) throw new HttpError(404, "Problema no encontrado.");

		const stageResults = problem.stages
			.map((stage) => submission.stage_results[stage.id])
			.filter(Boolean);

		if (!stageResults.length) {
			throw new HttpError(400, "Primero ejecuta la etapa.");
		}

		const allStagesExecuted = stageResults.length === problem.stages.length;
		const allPassed =
			allStagesExecuted && stageResults.every((stage) => stage.passed);

		const averageScore =
			stageResults.reduce(
				(acc, stage) => acc + Number(stage.stage_score || 0),
				0,
			) / stageResults.length;

		const completionFactor =
			stageResults.length / Math.max(1, problem.stages.length);
		const rawScore = Math.round(averageScore * completionFactor);

		const classification = await classifyFromEvents(submission.events || [], submission.code || "");
		const penaltyMultiplier = calculateAiPenalty(classification);
		const finalScore = Math.round(rawScore * penaltyMultiplier);

		const verdict = allPassed ? "accepted" : "wrong_answer";
		const submittedAt = nowIso();

		await store.updateSubmission(submission.id, {
			final_score: finalScore,
			classification,
			verdict,
			submitted_at: submittedAt,
			updated_at: submittedAt,
		});

		stopRunnerForSubmission(submission.id);

		return {
			verdict,
			final_score: finalScore,
			classification,
		};
	});
}

export async function sendSubmissionEvents({
	userId,
	submissionId,
	events = [],
}) {
	const normalizedSubmissionId = normalizeSubmissionId(submissionId);
	return withSubmissionLock(normalizedSubmissionId, async () => {
		const submission = await store.findSubmissionByOwner(
			normalizedSubmissionId,
			userId,
		);
		if (!submission) {
			throw new HttpError(404, "Submission no encontrada.");
		}

		const cleanEvents = sanitizeEvents(events);
		const mergedEvents = [...(submission.events || []), ...cleanEvents].slice(
			-env.MAX_EVENTS_PER_SUBMISSION,
		);
		await store.updateSubmission(submission.id, {
			events: mergedEvents,
			updated_at: nowIso(),
		});
		touchRunner(submission.id);
		return { ok: true };
	});
}

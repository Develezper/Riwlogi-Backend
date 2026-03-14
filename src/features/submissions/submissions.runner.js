import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

const MAX_OUTPUT_CHARS = 8000;
const TIMEOUT_MS = 1500;
const RUNNER_IDLE_TTL_MS = 60000;
const CLEANUP_INTERVAL_MS = 15000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PYTHON_RUNNER_PATH = path.resolve(__dirname, "./python-runner.py");

const pythonRunners = new Map();
let cleanupTimer = null;

function truncateOutput(text) {
	const safe = typeof text === "string" ? text : "";
	if (safe.length <= MAX_OUTPUT_CHARS) return safe;
	return `${safe.slice(0, MAX_OUTPUT_CHARS)}
... [salida truncada]`;
}

function ensureCleanupTimer() {
	if (cleanupTimer) return;
	cleanupTimer = setInterval(() => {
		const now = Date.now();
		for (const [submissionId, runner] of pythonRunners.entries()) {
			if (!runner.isAlive()) {
				pythonRunners.delete(submissionId);
				continue;
			}
			if (now - runner.lastSeen > RUNNER_IDLE_TTL_MS) {
				runner.stop();
				pythonRunners.delete(submissionId);
			}
		}
	}, CLEANUP_INTERVAL_MS);
	cleanupTimer.unref?.();
}

class PythonRunner {
	constructor(pythonExecutable) {
		this.pythonExecutable = pythonExecutable;
		this.pending = new Map();
		this.buffer = "";
		this.lastSeen = Date.now();
		this.alive = true;

		this.child = spawn(this.pythonExecutable, ["-u", PYTHON_RUNNER_PATH], {
			stdio: ["pipe", "pipe", "pipe"],
		});

		this.child.stdout?.on("data", (chunk) => this._onStdout(chunk));
		this.child.stderr?.on("data", (chunk) => {
			const stderr = chunk ? chunk.toString() : "";
			if (stderr.trim()) {
				logger.warn({ stderr }, "Python runner stderr");
			}
		});

		this.child.on("exit", (code, signal) => {
			this.alive = false;
			const message = `Python runner exited (${code ?? "?"}/${signal ?? "?"})`;
			for (const [id, pending] of this.pending.entries()) {
				clearTimeout(pending.timer);
				pending.resolve({
					stdout: "",
					stderr: message,
					runtime_ms: 0,
					exit_code: code ?? null,
					timed_out: false,
				});
				this.pending.delete(id);
			}
		});

		this.child.on("error", (error) => {
			this.alive = false;
			const message = `Python runner error: ${error?.message || "error"}`;
			for (const [id, pending] of this.pending.entries()) {
				clearTimeout(pending.timer);
				pending.resolve({
					stdout: "",
					stderr: message,
					runtime_ms: 0,
					exit_code: null,
					timed_out: false,
				});
				this.pending.delete(id);
			}
		});
	}

	isAlive() {
		return Boolean(this.alive && this.child && !this.child.killed);
	}

	touch() {
		this.lastSeen = Date.now();
	}

	stop() {
		if (!this.child || this.child.killed) return;
		try {
			this.child.kill("SIGKILL");
		} catch {
			// ignore
		}
	}

	run(code) {
		if (!this.isAlive()) {
			return Promise.resolve({
				stdout: "",
				stderr: "Runner no disponible.",
				runtime_ms: 0,
				exit_code: null,
				timed_out: false,
			});
		}

		this.touch();

		const id = randomUUID();
		const payload = JSON.stringify({ id, code: String(code ?? "") });

		return new Promise((resolve) => {
			const start = Date.now();
			const timer = setTimeout(() => {
				this.pending.delete(id);
				this.stop();
				resolve({
					stdout: "",
					stderr: `Tiempo de ejecucion excedido (${TIMEOUT_MS}ms).`,
					runtime_ms: Date.now() - start,
					exit_code: null,
					timed_out: true,
				});
			}, TIMEOUT_MS);

			this.pending.set(id, { resolve, timer });

			try {
				this.child.stdin?.write(`${payload}\n`);
			} catch (error) {
				clearTimeout(timer);
				this.pending.delete(id);
				resolve({
					stdout: "",
					stderr: `No se pudo enviar el codigo (${error?.message || "error"}).`,
					runtime_ms: Date.now() - start,
					exit_code: null,
					timed_out: false,
				});
			}
		});
	}

	_onStdout(chunk) {
		const incoming = chunk ? chunk.toString() : "";
		if (!incoming) return;
		this.buffer += incoming;

		let index = this.buffer.indexOf("\n");
		while (index >= 0) {
			const line = this.buffer.slice(0, index);
			this.buffer = this.buffer.slice(index + 1);
			this._handleLine(line);
			index = this.buffer.indexOf("\n");
		}
	}

	_handleLine(line) {
		const trimmed = line.trim();
		if (!trimmed) return;

		let payload = null;
		try {
			payload = JSON.parse(trimmed);
		} catch {
			logger.warn(
				{ line: trimmed.slice(0, 120) },
				"Invalid python runner payload",
			);
			return;
		}

		const id = payload?.id;
		if (!id || !this.pending.has(id)) return;

		const pending = this.pending.get(id);
		this.pending.delete(id);
		clearTimeout(pending.timer);
		this.touch();

		const runtimeMs = Number(payload?.runtime_ms ?? 0);
		pending.resolve({
			stdout: truncateOutput(payload?.stdout || ""),
			stderr: truncateOutput(payload?.stderr || ""),
			runtime_ms: Number.isFinite(runtimeMs) ? runtimeMs : 0,
			exit_code: null,
			timed_out: false,
		});
	}
}

function getPythonRunner(submissionId) {
	if (!submissionId) return null;
	const existing = pythonRunners.get(submissionId);
	if (existing?.isAlive()) {
		existing.touch();
		return existing;
	}

	const pythonExecutable = env.CLASSIFIER_API_PYTHON || "python";
	const runner = new PythonRunner(pythonExecutable);
	pythonRunners.set(submissionId, runner);
	ensureCleanupTimer();
	return runner;
}

export function ensureRunnerForSubmission(submissionId, language) {
	if (String(language || "").toLowerCase() !== "python") return;
	getPythonRunner(submissionId);
}

export function touchRunner(submissionId) {
	const runner = pythonRunners.get(submissionId);
	if (runner) runner.touch();
}

export function stopRunnerForSubmission(submissionId) {
	const runner = pythonRunners.get(submissionId);
	if (!runner) return;
	runner.stop();
	pythonRunners.delete(submissionId);
}

function resolveRunner(language) {
	if (language === "javascript") {
		return {
			command: process.execPath,
			args: ["run"],
			ext: "js",
		};
	}

	if (language === "typescript") {
		return {
			command: process.execPath,
			args: ["run"],
			ext: "ts",
		};
	}

	return null;
}

async function runWithSpawn({ language, code }) {
	const normalizedLanguage = String(language || "").toLowerCase();
	const runner = resolveRunner(normalizedLanguage);
	if (!runner) {
		return {
			stdout: "",
			stderr: `Lenguaje ${normalizedLanguage} no soportado.`,
			runtime_ms: 0,
			exit_code: null,
			timed_out: false,
		};
	}

	const tempFile = path.join(
		os.tmpdir(),
		`riwlog-run-${randomUUID()}.${runner.ext}`,
	);
	const start = Date.now();
	let stdout = "";
	let stderr = "";
	let exitCode = null;
	let timedOut = false;

	try {
		await fs.writeFile(tempFile, String(code ?? ""), "utf8");
	} catch (error) {
		logger.error({ err: error }, "Failed to write temp code file");
		return {
			stdout: "",
			stderr: "No se pudo preparar la ejecucion.",
			runtime_ms: 0,
			exit_code: null,
			timed_out: false,
		};
	}

	try {
		const proc = Bun.spawn({
			cmd: [runner.command, ...runner.args, tempFile],
			cwd: os.tmpdir(),
			env: {},
			stdout: "pipe",
			stderr: "pipe",
			timeout: TIMEOUT_MS,
		});

		const exitCodeValue = await proc.exited;

		exitCode = exitCodeValue;
		timedOut = Date.now() - start >= TIMEOUT_MS;

		stdout = await new Response(proc.stdout).text();
		stderr = await new Response(proc.stderr).text();
	} catch (error) {
		logger.error(
			{ err: error, language: normalizedLanguage },
			"Failed to run user code",
		);
		stderr = `No se pudo ejecutar el codigo (${error?.message || "error inesperado"}).`;
	} finally {
		fs.unlink(tempFile).catch(() => {});
	}

	stdout = truncateOutput(stdout);
	stderr = truncateOutput(stderr);

	return {
		stdout,
		stderr,
		runtime_ms: Date.now() - start,
		exit_code: exitCode,
		timed_out: timedOut,
	};
}

export async function runUserCode({ submissionId, language, code }) {
	const normalizedLanguage = String(language || "").toLowerCase();
	if (normalizedLanguage === "python") {
		const runner = getPythonRunner(submissionId);
		if (!runner) {
			return {
				stdout: "",
				stderr: "Runner no disponible.",
				runtime_ms: 0,
				exit_code: null,
				timed_out: false,
			};
		}

		return runner.run(code);
	}

	return runWithSpawn({ language: normalizedLanguage, code });
}

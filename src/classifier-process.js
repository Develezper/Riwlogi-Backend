import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let classifierProcess = null;

function resolveClassifierDir() {
  return path.resolve(__dirname, "../../api");
}

function resolvePythonExecutable() {
  return env.CLASSIFIER_API_PYTHON || "python";
}

export function startClassifierApi() {
  if (!env.START_CLASSIFIER_API) return;
  if (classifierProcess) return;

  const classifierDir = resolveClassifierDir();
  if (!existsSync(classifierDir)) {
    logger.warn({ classifier_dir: classifierDir }, "Classifier API directory not found; skipping autostart.");
    return;
  }

  const host = env.CLASSIFIER_API_HOST || "127.0.0.1";
  const port = env.CLASSIFIER_API_PORT || 8001;
  const pythonExecutable = resolvePythonExecutable();

  if (!env.CLASSIFIER_API_BASE) {
    logger.warn(
      { expected_base: `http://${host}:${port}` },
      "CLASSIFIER_API_BASE is empty; backend will use heuristic fallback only.",
    );
  }

  logger.info(
    {
      classifier_dir: classifierDir,
      host,
      port,
      python: pythonExecutable,
    },
    "Starting classifier API process",
  );

  classifierProcess = spawn(
    pythonExecutable,
    ["-m", "uvicorn", "main:app", "--host", host, "--port", String(port)],
    {
      cwd: classifierDir,
      stdio: "inherit",
      env: {
        ...process.env,
        HOST: host,
        PORT: String(port),
      },
    },
  );

  classifierProcess.on("exit", (code, signal) => {
    logger.warn({ code, signal }, "Classifier API process exited");
    classifierProcess = null;
  });

  classifierProcess.on("error", (error) => {
    logger.error({ err: error }, "Failed to start classifier API process");
  });
}

export async function stopClassifierApi() {
  if (!classifierProcess) return;

  const processRef = classifierProcess;
  classifierProcess = null;

  await new Promise((resolve) => {
    processRef.once("exit", () => resolve());
    processRef.kill("SIGTERM");

    setTimeout(() => {
      if (!processRef.killed) {
        processRef.kill("SIGKILL");
      }
      resolve();
    }, 5000).unref();
  });
}

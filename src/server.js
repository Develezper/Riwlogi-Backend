import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger, usingPino, usingPinoPretty } from "./config/logger.js";
import { closeStore, initializeStore } from "./data/store.js";

let httpServer = null;
let isShuttingDown = false;

async function startServer() {
  await initializeStore();

  httpServer = app.listen(env.PORT, env.HOST, () => {
    if (!usingPino) {
      logger.warn(
        { package: "pino+pino-http" },
        "pino packages not installed; using fallback structured logger",
      );
    }

    logger.info(
      {
        host: env.HOST,
        port: env.PORT,
        api_prefix: env.API_PREFIX,
        store_provider: env.STORE_PROVIDER,
        pretty_logging: usingPinoPretty,
      },
      "Riwlogi backend started",
    );
  });
}

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, "Shutting down backend");

  await new Promise((resolve) => {
    if (!httpServer) {
      resolve();
      return;
    }

    httpServer.close(() => resolve());

    setTimeout(() => {
      logger.warn({ timeout_ms: 10_000 }, "HTTP server close timeout reached");
      resolve();
    }, 10_000).unref();
  });

  try {
    await closeStore();
  } catch (error) {
    logger.error({ err: error }, "Error while closing store");
  }
}

startServer().catch((error) => {
  logger.fatal({ err: error }, "Failed to start server");
  process.exit(1);
});

process.on("SIGINT", async () => {
  await shutdown("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await shutdown("SIGTERM");
  process.exit(0);
});

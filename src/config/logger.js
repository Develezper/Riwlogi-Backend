import { env } from "./env.js";
import { requestId } from "../utils/id.js";

const baseRedactions = [
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers['set-cookie']",
  "req.body.password",
  "req.body.token",
  "req.body.access_token",
];

const logLevelWeights = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

function shouldLog(level, minLevel) {
  const levelWeight = logLevelWeights[level] || logLevelWeights.info;
  const minWeight = logLevelWeights[minLevel] || logLevelWeights.info;
  return levelWeight >= minWeight;
}

function buildFallbackLogger(minLevel, base = {}) {
  function emit(level, payload, message) {
    if (!shouldLog(level, minLevel)) return;

    const event = {
      level,
      time: new Date().toISOString(),
      msg: String(message || ""),
      ...base,
      ...(payload && typeof payload === "object" ? payload : {}),
    };

    if (level === "error" || level === "fatal") {
      console.error(JSON.stringify(event));
      return;
    }

    if (level === "warn") {
      console.warn(JSON.stringify(event));
      return;
    }

    console.log(JSON.stringify(event));
  }

  return {
    trace(payload, message) {
      emit("trace", payload, message);
    },
    debug(payload, message) {
      emit("debug", payload, message);
    },
    info(payload, message) {
      emit("info", payload, message);
    },
    warn(payload, message) {
      emit("warn", payload, message);
    },
    error(payload, message) {
      emit("error", payload, message);
    },
    fatal(payload, message) {
      emit("fatal", payload, message);
    },
    child(childBase = {}) {
      return buildFallbackLogger(minLevel, { ...base, ...childBase });
    },
  };
}

function buildFallbackHttpLogger(baseLogger) {
  return (req, res, next) => {
    const existing = String(req.headers["x-request-id"] || "").trim();
    const reqId = existing || requestId();
    const startedAt = Date.now();

    req.id = req.id || reqId;
    req.log = baseLogger.child({ request_id: req.id });
    res.setHeader("x-request-id", req.id);

    res.on("finish", () => {
      const url = req.originalUrl || req.url;
      if (url === "/" || url.startsWith("/api/health")) return;

      const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
      req.log[level](
        {
          method: req.method,
          url,
          status_code: res.statusCode,
          duration_ms: Date.now() - startedAt,
        },
        "request completed",
      );
    });

    next();
  };
}

async function initializeLogger() {
  try {
    const [{ default: pino }, { default: pinoHttp }] = await Promise.all([
      import("pino"),
      import("pino-http"),
    ]);

    const pinoOptions = {
      level: env.LOG_LEVEL,
      redact: {
        paths: baseRedactions,
        censor: "[REDACTED]",
      },
    };

    let usingPinoPretty = false;
    const shouldUsePretty = env.NODE_ENV !== "production" && env.LOG_PRETTY;
    if (shouldUsePretty) {
      try {
        await import("pino-pretty");
        pinoOptions.transport = {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        };
        usingPinoPretty = true;
      } catch {
        usingPinoPretty = false;
      }
    }

    const baseLogger = pino(pinoOptions);

    const requestLogger = pinoHttp({
      logger: baseLogger,
      genReqId(req, res) {
        const existing = String(req.headers["x-request-id"] || "").trim();
        const generated = existing || requestId();
        if (typeof res.setHeader === "function") {
          res.setHeader("x-request-id", generated);
        }
        return generated;
      },
      customLogLevel(_req, res, error) {
        if (error || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
      customProps(req) {
        return { request_id: req.id };
      },
      autoLogging: {
        ignore(req) {
          return req.url === "/" || req.url.startsWith("/api/health");
        },
      },
    });

    return {
      logger: baseLogger,
      httpLogger: requestLogger,
      usingPino: true,
      usingPinoPretty,
    };
  } catch {
    const baseLogger = buildFallbackLogger(env.LOG_LEVEL);
    return {
      logger: baseLogger,
      httpLogger: buildFallbackHttpLogger(baseLogger),
      usingPino: false,
      usingPinoPretty: false,
    };
  }
}

const runtime = await initializeLogger();

export const logger = runtime.logger;
export const httpLogger = runtime.httpLogger;
export const usingPino = runtime.usingPino;
export const usingPinoPretty = runtime.usingPinoPretty;

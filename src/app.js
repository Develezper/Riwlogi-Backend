import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { httpLogger } from "./config/logger.js";
import { helmetMiddleware } from "./config/security.js";
import { apiRoutes } from "./api.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";

const app = express();

const corsOrigins = env.CORS_ORIGINS;
const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    
    if (corsOrigins.includes("*") || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    
    callback(null, false);
  },
};

app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY);
app.use(httpLogger);
app.use(helmetMiddleware);
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "riwlogi-backend", docs: `${env.API_PREFIX}/health` });
});

app.use(env.API_PREFIX, apiRoutes);

app.use(notFound);
app.use(errorHandler);

export { app };

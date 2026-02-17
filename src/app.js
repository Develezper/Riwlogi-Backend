import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { apiRoutes } from "./api.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { requestContext } from "./middleware/request-context.js";

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
app.use(requestContext);
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "riwlog-backend", docs: `${env.API_PREFIX}/health` });
});

app.use(env.API_PREFIX, apiRoutes);
app.use(notFound);
app.use(errorHandler);

export { app };

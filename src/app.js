import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { apiRoutes } from "./routes.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { notFound } from "./middlewares/not-found.js";
import { requestContext } from "./middlewares/request-context.js";

const app = express();

app.disable("x-powered-by");
app.use(requestContext);
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "riwlog-backend", docs: `${env.API_PREFIX}/health` });
});

app.use(env.API_PREFIX, apiRoutes);
app.use(notFound);
app.use(errorHandler);

export { app };

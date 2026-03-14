import cors from "cors";
import express from "express";
import { apiRoutes } from "./api.routes.js";
import { env } from "./config/env.js";
import { httpLogger } from "./config/logger.js";
import { helmetMiddleware } from "./config/security.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";

const app = express();

function normalizeOrigin(value) {
	const normalized = String(value || "").trim();
	if (!normalized) return "";
	return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

const corsOrigins = env.CORS_ORIGINS.map(normalizeOrigin).filter(Boolean);
const allowAllOrigins = corsOrigins.includes("*");
const corsOptions = {
	origin(origin, callback) {
		if (!origin) {
			callback(null, true);
			return;
		}

		if (allowAllOrigins) {
			callback(null, true);
			return;
		}

		const normalizedOrigin = normalizeOrigin(origin);
		if (corsOrigins.includes(normalizedOrigin)) {
			callback(null, true);
			return;
		}

		callback(null, false);
	},
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
	credentials: false,
	optionsSuccessStatus: 204,
};

app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY);
//app.use(httpLogger);
app.use(helmetMiddleware);
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
	res.json({
		ok: true,
		service: "riwlogi-backend",
		docs: `${env.API_PREFIX}/health`,
	});
});

app.use(env.API_PREFIX, apiRoutes);

app.use(notFound);
app.use(errorHandler);

export { app };

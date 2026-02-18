import { requestId } from "../utils/id.js";

export function requestContext(req, res, next) {
  const id = requestId();
  const startedAt = Date.now();

  req.context = { requestId: id, startedAt };
  res.setHeader("x-request-id", id);

  res.on("finish", () => {
    const duration = Date.now() - startedAt;
    const status = res.statusCode;
    const method = req.method;
    const url = req.originalUrl;
    console.log(`[${id}] ${method} ${url} ${status} ${duration}ms`);
  });

  next();
}

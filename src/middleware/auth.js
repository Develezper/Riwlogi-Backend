import { store } from "../data/store.js";
import { HttpError } from "../utils/http-error.js";

export function requireAuth(req, _res, next) {
  const header = String(req.headers.authorization || "").trim();
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    next(new HttpError(401, "Debes iniciar sesión para continuar."));
    return;
  }

  const session = store.findSession(token);
  if (!session) {
    next(new HttpError(401, "Sesión inválida o expirada."));
    return;
  }

  const user = store.findUserById(session.user_id);
  if (!user) {
    next(new HttpError(401, "Sesión inválida o expirada."));
    return;
  }

  req.auth = {
    token,
    userId: user.id,
    user,
  };

  next();
}

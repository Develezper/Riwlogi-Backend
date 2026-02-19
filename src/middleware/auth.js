import { store } from "../data/store.js";
import { HttpError } from "../utils/http-error.js";

export function requireAuth(req, _res, next) {
  store.cleanupExpiredSessions();
  const header = String(req.headers.authorization || "").trim();
  const [scheme, token] = header.split(/\s+/);

  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
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
    store.revokeSession(token);
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

export function requireRole(role) {
  const normalizedRole = String(role || "").trim().toLowerCase();

  return function enforceRole(req, _res, next) {
    if (!req.auth || !req.auth.user) {
      next(new HttpError(401, "No autenticado."));
      return;
    }

    const userRole = String(req.auth.user.role || "user").toLowerCase();
    if (userRole !== normalizedRole) {
      next(new HttpError(403, "Acceso denegado."));
      return;
    }

    next();
  };
}

import { store } from "../data/store.js";
import { HttpError } from "../utils/http-error.js";

export async function requireAuth(req, _res, next) {
  try {
    const header = String(req.headers.authorization || "").trim();
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new HttpError(401, "Debes iniciar sesión para continuar.");
    }

    const session = await store.findSession(token);
    if (!session) {
      throw new HttpError(401, "Sesión inválida o expirada.");
    }

    const user = await store.findUserById(session.user_id);
    if (!user) {
      throw new HttpError(401, "Sesión inválida o expirada.");
    }

    req.auth = {
      token,
      userId: user.id,
      user,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(role) {
  return (req, _res, next) => {
    const requiredRole = String(role || "").trim().toLowerCase();
    const actualRole = String(req.auth?.user?.role || "").trim().toLowerCase();

    if (!requiredRole || actualRole === requiredRole) {
      next();
      return;
    }

    next(new HttpError(403, "No tienes permisos para realizar esta acción."));
  };
}

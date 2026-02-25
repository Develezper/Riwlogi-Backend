import { store } from "../../data/store.js";
import { verifyPassword } from "../../utils/password.js";
import { HttpError } from "../../utils/http-error.js";
import { parseLoginInput, parseRegisterInput } from "./auth.validation.js";

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role || "user",
    display_name: user.display_name || user.username,
    created_at: user.created_at,
  };
}

function issueSession(userId) {
  const session = store.createSession(userId);
  return {
    access_token: session.token,
    expires_at: session.expires_at,
  };
}

export function login({ identifier, email, password }) {
  const { identifier: cleanIdentifier, password: cleanPassword } = parseLoginInput({
    identifier,
    email,
    password,
  });

  const user = store.findUserByIdentifier(cleanIdentifier);
  if (!user || !verifyPassword(cleanPassword, user.password_hash)) {
    throw new HttpError(401, "Credenciales inválidas.");
  }

  return {
    ...issueSession(user.id),
    user: toPublicUser(user),
  };
}

export function register({ username, email, password }) {
  const { username: cleanUsername, email: cleanEmail, password: cleanPassword } = parseRegisterInput({
    username,
    email,
    password,
  });

  if (store.usernameExists(cleanUsername)) {
    throw new HttpError(409, "Ese username ya está en uso.");
  }

  if (store.emailExists(cleanEmail)) {
    throw new HttpError(409, "Ese email ya está registrado.");
  }

  const user = store.createUser({
    username: cleanUsername,
    email: cleanEmail,
    password: cleanPassword,
  });

  return {
    ...issueSession(user.id),
    user: toPublicUser(user),
  };
}

export function logout(token) {
  const revoked = store.revokeSession(token);
  if (!revoked) {
    throw new HttpError(401, "Sesión inválida o expirada.");
  }
  return { ok: true };
}

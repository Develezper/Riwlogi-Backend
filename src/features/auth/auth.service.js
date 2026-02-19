import { store } from "../../data/store.js";
import { verifyPassword } from "../../utils/password.js";
import { HttpError } from "../../utils/http-error.js";

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

function cleanString(value) {
  return String(value || "").trim();
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUsername(username) {
  return /^[a-zA-Z0-9_]+$/.test(username);
}

function issueSession(userId) {
  const session = store.createSession(userId);
  return {
    access_token: session.token,
    expires_at: session.expires_at,
  };
}

export function login({ identifier, email, password }) {
  const cleanIdentifier = cleanString(identifier || email);
  const cleanPassword = cleanString(password);

  if (!cleanIdentifier || !cleanPassword) {
    throw new HttpError(400, "Debes enviar identificador y contraseña.");
  }

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
  const cleanUsername = cleanString(username);
  const cleanEmail = cleanString(email).toLowerCase();
  const cleanPassword = cleanString(password);

  if (!cleanUsername || !cleanEmail || !cleanPassword) {
    throw new HttpError(400, "Todos los campos son obligatorios.");
  }

  if (cleanUsername.length < 3) {
    throw new HttpError(400, "El username debe tener al menos 3 caracteres.");
  }

  if (cleanUsername.length > 30) {
    throw new HttpError(400, "El username no puede superar 30 caracteres.");
  }

  if (!validateUsername(cleanUsername)) {
    throw new HttpError(400, "El username solo permite letras, números y guion bajo.");
  }

  if (!validateEmail(cleanEmail)) {
    throw new HttpError(400, "Debes enviar un email válido.");
  }

  if (cleanPassword.length < 6) {
    throw new HttpError(400, "La contraseña debe tener al menos 6 caracteres.");
  }

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

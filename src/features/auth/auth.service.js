import { store } from "../../data/store.js";
import { verifyPassword } from "../../utils/password.js";
import { HttpError } from "../../utils/http-error.js";

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
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

export function login({ identifier, password }) {
  const cleanIdentifier = cleanString(identifier);
  const cleanPassword = cleanString(password);

  if (!cleanIdentifier || !cleanPassword) {
    throw new HttpError(400, "Debes enviar email y contraseña.");
  }

  const user = store.findUserByIdentifier(cleanIdentifier);
  if (!user || !verifyPassword(cleanPassword, user.password_hash)) {
    throw new HttpError(401, "Credenciales inválidas.");
  }

  const token = store.createSession(user.id);

  return {
    access_token: token,
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

  const token = store.createSession(user.id);

  return {
    access_token: token,
    user: toPublicUser(user),
  };
}

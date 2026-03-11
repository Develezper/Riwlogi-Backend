import { store } from "../../data/store.js";
import { parseLoginInput, parseRegisterInput } from "./auth.validation.js";
import { verifyPassword } from "../../utils/password.js";
import { HttpError } from "../../utils/http-error.js";

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    display_name: user.display_name || user.username,
    created_at: user.created_at,
  };
}

function isUniqueViolation(error) {
  if (!error) return false;
  if (error.code === "23505") return true;
  const message = String(error.message || "").toLowerCase();
  return message.includes("unique");
}

export async function login(input) {
  const { identifier, password } = parseLoginInput(input);
  const user = await store.findUserByIdentifier(identifier);
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new HttpError(401, "Credenciales inválidas.");
  }

  const session = await store.createSession(user.id);

  return {
    access_token: session.token,
    expires_at: session.expires_at,
    user: toPublicUser(user),
  };
}

export async function register(input) {
  const { username, email, password } = parseRegisterInput(input);

  if (await store.usernameExists(username)) {
    throw new HttpError(409, "Ese username ya está en uso.");
  }

  if (await store.emailExists(email)) {
    throw new HttpError(409, "Ese email ya está registrado.");
  }

  let user;
  try {
    user = await store.createUser({
      username,
      email,
      password,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "Ese username o email ya está registrado.");
    }
    throw error;
  }

  const session = await store.createSession(user.id);

  return {
    access_token: session.token,
    expires_at: session.expires_at,
    user: toPublicUser(user),
  };
}

export async function logout(token) {
  const cleanToken = String(token || "").trim();
  if (!cleanToken) {
    throw new HttpError(401, "Sesión inválida o expirada.");
  }

  const revoked = await store.revokeSession(cleanToken);
  if (!revoked) {
    throw new HttpError(401, "Sesión inválida o expirada.");
  }

  return { ok: true };
}

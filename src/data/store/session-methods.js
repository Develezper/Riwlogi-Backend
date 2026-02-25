import { env } from "../../config/env.js";
import { sessionToken } from "../../utils/id.js";
import { toId } from "./utils.js";

const SESSION_TTL_MS = env.SESSION_TTL_HOURS * 60 * 60 * 1000;

export const sessionStoreMethods = {
  createSession(userId) {
    this.cleanupExpiredSessions();

    const normalizedUserId = toId(userId);
    const token = sessionToken();
    const createdAtMs = Date.now();
    const session = {
      token,
      user_id: normalizedUserId,
      created_at: new Date(createdAtMs).toISOString(),
      expires_at: new Date(createdAtMs + SESSION_TTL_MS).toISOString(),
    };

    this.sessions.set(token, session);
    if (!this.sessionsByUser.has(normalizedUserId)) {
      this.sessionsByUser.set(normalizedUserId, new Set());
    }
    this.sessionsByUser.get(normalizedUserId).add(token);

    return {
      token,
      expires_at: session.expires_at,
    };
  },

  deleteSession(token) {
    const normalized = toId(token);
    if (!normalized) return false;

    const session = this.sessions.get(normalized);
    if (!session) return false;

    this.sessions.delete(normalized);
    const tokens = this.sessionsByUser.get(session.user_id);
    if (tokens) {
      tokens.delete(normalized);
      if (tokens.size === 0) this.sessionsByUser.delete(session.user_id);
    }
    return true;
  },

  revokeSession(token) {
    return this.deleteSession(token);
  },

  revokeSessionsByUser(userId) {
    const normalized = toId(userId);
    if (!normalized) return 0;

    const tokens = this.sessionsByUser.get(normalized);
    if (!tokens || tokens.size === 0) return 0;

    const list = [...tokens];
    list.forEach((token) => this.deleteSession(token));
    return list.length;
  },

  cleanupExpiredSessions() {
    const nowMs = Date.now();
    const expiredTokens = [];

    this.sessions.forEach((session, token) => {
      const expiresMs = new Date(session.expires_at).getTime();
      if (!Number.isFinite(expiresMs) || expiresMs <= nowMs) {
        expiredTokens.push(token);
      }
    });

    expiredTokens.forEach((token) => this.deleteSession(token));
    return expiredTokens.length;
  },

  findSession(token) {
    const normalized = toId(token);
    if (!normalized) return null;

    const session = this.sessions.get(normalized);
    if (!session) return null;

    const expiresMs = new Date(session.expires_at).getTime();
    if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) {
      this.deleteSession(normalized);
      return null;
    }

    return session;
  },
};

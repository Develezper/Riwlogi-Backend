import { env } from "../config/env.js";
import { uid, sessionToken } from "../utils/id.js";
import { hashPassword } from "../utils/password.js";
import { nowIso } from "../utils/time.js";
import { DEFAULT_USERS } from "./seeds.js";

const SESSION_TTL_MS = env.SESSION_TTL_HOURS * 60 * 60 * 1000;

function normalizeUser(user) {
  return {
    id: String(user.id || uid("user")),
    username: String(user.username || "").trim(),
    email: String(user.email || "").trim().toLowerCase(),
    password_hash: String(user.password_hash || ""),
    role: String(user.role || "user").toLowerCase(),
    display_name: String(user.display_name || user.username || "").trim(),
    created_at: String(user.created_at || nowIso()),
  };
}

class InMemoryStore {
  constructor() {
    this.users = [];
    this.userById = new Map();
    this.userByEmail = new Map();
    this.userByUsername = new Map();

    this.sessions = new Map();
    this.sessionsByUser = new Map();

    this.submissions = [];
    this.submissionById = new Map();
    this.submissionIdsByUser = new Map();

    this.bootstrap();
  }

  bootstrap() {
    if (this.users.length > 0) return;

    this.users = DEFAULT_USERS.map((user) =>
      normalizeUser({
        ...user,
        password_hash: hashPassword(user.password),
      }),
    );

    this.rebuildUserIndexes();
  }

  rebuildUserIndexes() {
    this.userById.clear();
    this.userByEmail.clear();
    this.userByUsername.clear();

    this.users.forEach((user) => {
      this.userById.set(user.id, user);
      this.userByEmail.set(user.email.toLowerCase(), user);
      this.userByUsername.set(user.username.toLowerCase(), user);
    });
  }

  reset() {
    this.users = [];
    this.sessions.clear();
    this.sessionsByUser.clear();
    this.submissions = [];
    this.submissionById.clear();
    this.submissionIdsByUser.clear();
    this.bootstrap();
  }

  listUsers() {
    return this.users.slice();
  }

  getUsers() {
    return this.listUsers();
  }

  findUserById(userId) {
    return this.userById.get(String(userId || "")) || null;
  }

  findUserByIdentifier(identifier) {
    const normalized = String(identifier || "").trim().toLowerCase();
    if (!normalized) return null;
    return this.userByEmail.get(normalized) || this.userByUsername.get(normalized) || null;
  }

  usernameExists(username) {
    const normalized = String(username || "").trim().toLowerCase();
    if (!normalized) return false;
    return this.userByUsername.has(normalized);
  }

  emailExists(email) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) return false;
    return this.userByEmail.has(normalized);
  }

  countAdmins() {
    return this.users.filter((user) => user.role === "admin").length;
  }

  createUser({ username, email, password, role = "user" }) {
    const user = normalizeUser({
      id: uid("user"),
      username,
      email,
      password_hash: hashPassword(password),
      role,
      display_name: username,
      created_at: nowIso(),
    });

    this.users.push(user);
    this.userById.set(user.id, user);
    this.userByEmail.set(user.email.toLowerCase(), user);
    this.userByUsername.set(user.username.toLowerCase(), user);

    return user;
  }

  deleteUser(userId) {
    const normalized = String(userId || "").trim();
    if (!normalized) return false;

    const index = this.users.findIndex((user) => user.id === normalized);
    if (index < 0) return false;

    const [removed] = this.users.splice(index, 1);
    this.userById.delete(removed.id);
    this.userByEmail.delete(removed.email.toLowerCase());
    this.userByUsername.delete(removed.username.toLowerCase());

    this.revokeSessionsByUser(removed.id);
    this.deleteSubmissionsByUser(removed.id);
    return true;
  }

  createSession(userId) {
    this.cleanupExpiredSessions();

    const token = sessionToken();
    const createdAtMs = Date.now();
    const session = {
      token,
      user_id: userId,
      created_at: new Date(createdAtMs).toISOString(),
      expires_at: new Date(createdAtMs + SESSION_TTL_MS).toISOString(),
    };

    this.sessions.set(token, session);
    if (!this.sessionsByUser.has(userId)) {
      this.sessionsByUser.set(userId, new Set());
    }
    this.sessionsByUser.get(userId).add(token);

    return {
      token,
      expires_at: session.expires_at,
    };
  }

  deleteSession(token) {
    const normalized = String(token || "").trim();
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
  }

  revokeSession(token) {
    return this.deleteSession(token);
  }

  revokeSessionsByUser(userId) {
    const normalized = String(userId || "").trim();
    if (!normalized) return 0;

    const tokens = this.sessionsByUser.get(normalized);
    if (!tokens || tokens.size === 0) return 0;

    const list = [...tokens];
    list.forEach((token) => this.deleteSession(token));
    return list.length;
  }

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
  }

  findSession(token) {
    const normalized = String(token || "").trim();
    if (!normalized) return null;

    const session = this.sessions.get(normalized);
    if (!session) return null;

    const expiresMs = new Date(session.expires_at).getTime();
    if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) {
      this.deleteSession(normalized);
      return null;
    }

    return session;
  }

  createSubmission({ user_id, problem_id, problem_title, language }) {
    const submission = {
      id: uid("sub"),
      user_id: String(user_id || ""),
      problem_id: String(problem_id || ""),
      problem_title: String(problem_title || ""),
      language: String(language || "python").toLowerCase(),
      code: "",
      stage_results: {},
      runtime_ms: 0,
      final_score: 0,
      verdict: "pending",
      events: [],
      created_at: nowIso(),
      updated_at: nowIso(),
      submitted_at: null,
    };

    this.submissions.push(submission);
    this.submissionById.set(submission.id, submission);

    if (!this.submissionIdsByUser.has(submission.user_id)) {
      this.submissionIdsByUser.set(submission.user_id, new Set());
    }
    this.submissionIdsByUser.get(submission.user_id).add(submission.id);

    return submission;
  }

  findSubmission(submissionId) {
    const normalized = String(submissionId || "").trim();
    if (!normalized) return null;
    return this.submissionById.get(normalized) || null;
  }

  findSubmissionByOwner(submissionId, userId) {
    const submission = this.findSubmission(submissionId);
    if (!submission) return null;
    return submission.user_id === String(userId || "") ? submission : null;
  }

  appendSubmissionEvents(submissionId, events = []) {
    const submission = this.findSubmission(submissionId);
    if (!submission) return false;

    if (Array.isArray(events) && events.length > 0) {
      submission.events.push(...events);
      if (submission.events.length > env.MAX_EVENTS_PER_SUBMISSION) {
        submission.events.splice(0, submission.events.length - env.MAX_EVENTS_PER_SUBMISSION);
      }
      submission.updated_at = nowIso();
    }

    return true;
  }

  listSubmissions() {
    return this.submissions.slice();
  }

  listSubmissionsByUser(userId) {
    const normalized = String(userId || "").trim();
    const ids = this.submissionIdsByUser.get(normalized);
    if (!ids || ids.size === 0) return [];

    return [...ids].map((id) => this.submissionById.get(id)).filter(Boolean);
  }

  deleteSubmissionsByUser(userId) {
    const normalized = String(userId || "").trim();
    if (!normalized) return 0;

    const ids = this.submissionIdsByUser.get(normalized);
    if (!ids || ids.size === 0) return 0;

    const idSet = new Set(ids);
    this.submissions = this.submissions.filter((submission) => !idSet.has(submission.id));
    idSet.forEach((submissionId) => this.submissionById.delete(submissionId));
    this.submissionIdsByUser.delete(normalized);
    return idSet.size;
  }
}

export const store = new InMemoryStore();

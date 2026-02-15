import { DEFAULT_USERS } from "./seeds.js";
import { uid, sessionToken } from "../utils/id.js";
import { hashPassword } from "../utils/password.js";
import { nowIso } from "../utils/time.js";

function normalizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    password_hash: user.password_hash,
    display_name: user.display_name || user.username,
    created_at: user.created_at || nowIso(),
  };
}

class InMemoryStore {
  constructor() {
    this.users = [];
    this.sessions = new Map();
    this.submissions = [];
    this.bootstrap();
  }

  bootstrap() {
    if (this.users.length) return;

    this.users = DEFAULT_USERS.map((user) =>
      normalizeUser({
        ...user,
        email: String(user.email || "").trim().toLowerCase(),
        password_hash: hashPassword(user.password),
      }),
    );
  }

  getUsers() {
    return this.users;
  }

  findUserById(userId) {
    return this.users.find((user) => user.id === userId) || null;
  }

  findUserByIdentifier(identifier) {
    const normalized = String(identifier || "").trim().toLowerCase();
    if (!normalized) return null;

    return (
      this.users.find((user) => user.email.toLowerCase() === normalized) ||
      this.users.find((user) => user.username.toLowerCase() === normalized) ||
      null
    );
  }

  usernameExists(username) {
    const normalized = String(username || "").trim().toLowerCase();
    return this.users.some((user) => user.username.toLowerCase() === normalized);
  }

  emailExists(email) {
    const normalized = String(email || "").trim().toLowerCase();
    return this.users.some((user) => user.email.toLowerCase() === normalized);
  }

  createUser({ username, email, password }) {
    const user = normalizeUser({
      id: uid("user"),
      username: String(username || "").trim(),
      email: String(email || "").trim().toLowerCase(),
      password_hash: hashPassword(password),
      display_name: String(username || "").trim(),
      created_at: nowIso(),
    });

    this.users.push(user);
    return user;
  }

  createSession(userId) {
    const token = sessionToken();
    this.sessions.set(token, {
      user_id: userId,
      created_at: nowIso(),
    });
    return token;
  }

  findSession(token) {
    return this.sessions.get(String(token || "")) || null;
  }

  createSubmission({ user_id, problem_id, problem_title, language }) {
    const submission = {
      id: uid("sub"),
      user_id,
      problem_id,
      problem_title,
      language,
      code: "",
      stage_results: {},
      runtime_ms: 0,
      final_score: 0,
      verdict: "pending",
      events: [],
      created_at: nowIso(),
      submitted_at: null,
    };

    this.submissions.push(submission);
    return submission;
  }

  findSubmission(submissionId) {
    return this.submissions.find((submission) => submission.id === submissionId) || null;
  }

  findSubmissionByOwner(submissionId, userId) {
    return (
      this.submissions.find(
        (submission) => submission.id === submissionId && submission.user_id === userId,
      ) || null
    );
  }

  listSubmissions() {
    return this.submissions;
  }

  listSubmissionsByUser(userId) {
    return this.submissions.filter((submission) => submission.user_id === userId);
  }
}

export const store = new InMemoryStore();

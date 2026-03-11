import { uid } from "../../utils/id.js";
import { hashPassword } from "../../utils/password.js";
import { nowIso } from "../../utils/time.js";
import { DEFAULT_USERS } from "../seeds.js";
import { normalizeUser, toId, toLookupKey } from "./utils.js";

export const userStoreMethods = {
  bootstrap() {
    if (this.users.length > 0) return;

    this.users = DEFAULT_USERS.map((user) =>
      normalizeUser({
        ...user,
        password_hash: hashPassword(user.password),
      }),
    );

    this.rebuildUserIndexes();
  },

  rebuildUserIndexes() {
    this.userById.clear();
    this.userByEmail.clear();
    this.userByUsername.clear();

    this.users.forEach((user) => {
      this.userById.set(user.id, user);
      this.userByEmail.set(user.email.toLowerCase(), user);
      this.userByUsername.set(user.username.toLowerCase(), user);
    });
  },

  reset() {
    this.users = [];
    this.sessions.clear();
    this.sessionsByUser.clear();
    this.submissions = [];
    this.submissionById.clear();
    this.submissionIdsByUser.clear();
    this.bootstrap();
  },

  listUsers() {
    return this.users.slice();
  },

  findUserById(userId) {
    return this.userById.get(toId(userId)) || null;
  },

  findUserByIdentifier(identifier) {
    const normalized = toLookupKey(identifier);
    if (!normalized) return null;
    return this.userByEmail.get(normalized) || this.userByUsername.get(normalized) || null;
  },

  usernameExists(username) {
    const normalized = toLookupKey(username);
    if (!normalized) return false;
    return this.userByUsername.has(normalized);
  },

  emailExists(email) {
    const normalized = toLookupKey(email);
    if (!normalized) return false;
    return this.userByEmail.has(normalized);
  },

  countAdmins() {
    return this.users.filter((user) => user.role === "admin").length;
  },

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
  },

  deleteUser(userId) {
    const normalized = toId(userId);
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
  },
};

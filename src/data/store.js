import { sessionStoreMethods } from "./store/session-methods.js";
import { submissionStoreMethods } from "./store/submission-methods.js";
import { userStoreMethods } from "./store/user-methods.js";

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
}

Object.assign(
  InMemoryStore.prototype,
  userStoreMethods,
  sessionStoreMethods,
  submissionStoreMethods,
);

export const store = new InMemoryStore();

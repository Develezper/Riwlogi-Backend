import { env } from "../config/env.js";
import { PostgresStore } from "./store/postgres-store.js";
import { sessionStoreMethods } from "./store/session-methods.js";
import { submissionStoreMethods } from "./store/submission-methods.js";
import { userStoreMethods } from "./store/user-methods.js";

class InMemoryStore {
  constructor() {
    this.provider = "memory";
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

  async healthCheck() {
    return {
      ok: true,
      provider: this.provider,
      checks: {
        sessions_cache: "up",
        submissions_cache: "up",
      },
    };
  }

  async close() {
    return;
  }
}

Object.assign(
  InMemoryStore.prototype,
  userStoreMethods,
  sessionStoreMethods,
  submissionStoreMethods,
);

const activeStore = env.STORE_PROVIDER === "postgres" ? new PostgresStore() : new InMemoryStore();

export const store = activeStore;

export async function initializeStore() {
  if (typeof store.bootstrap === "function") {
    await store.bootstrap();
  }
}

export async function closeStore() {
  if (typeof store.close === "function") {
    await store.close();
  }
}

export async function checkStoreReadiness() {
  if (typeof store.healthCheck === "function") {
    return store.healthCheck();
  }

  return {
    ok: true,
    provider: env.STORE_PROVIDER,
    checks: {
      store: "up",
    },
  };
}

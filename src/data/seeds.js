import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "../..");
const handoffDir = path.join(backendRoot, "src", "data", "backend-handoff");

const FALLBACK_USERS = [
  {
    id: "user_admin",
    username: "admin",
    email: "admin@riwlogi.dev",
    password: "admin123",
    role: "admin",
    display_name: "Administrator",
    created_at: "2026-01-01T10:00:00.000Z",
  },
  {
    id: "user_demo",
    username: "demo",
    email: "demo@riwlogi.dev",
    password: "123456",
    role: "user",
    display_name: "Demo User",
    created_at: "2026-01-03T10:00:00.000Z",
  },
  {
    id: "user_code_ninja",
    username: "code_ninja",
    email: "code@riwlogi.dev",
    password: "123456",
    role: "user",
    display_name: "Code Ninja",
    created_at: "2025-11-22T10:00:00.000Z",
  },
];

function readHandoffItems(fileName) {
  try {
    const filePath = path.join(handoffDir, fileName);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return null;

    return parsed.items;
  } catch {
    return null;
  }
}

function normalizeUsers(items) {
  return items
    .map((entry) => ({
      id: String(entry?.id || "").trim(),
      username: String(entry?.username || "").trim(),
      email: String(entry?.email || "").trim().toLowerCase(),
      password: String(entry?.password || entry?.password_plain || "123456"),
      role: String(entry?.role || "user").trim(),
      display_name: String(entry?.display_name || entry?.username || "").trim(),
      created_at: String(entry?.created_at || ""),
    }))
    .filter((entry) => entry.id && entry.username && entry.email && entry.password);
}

function mergeUsers(baseUsers, extraUsers) {
  const mergedByEmail = new Map();

  [...baseUsers, ...extraUsers].forEach((user) => {
    const key = String(user.email || "").trim().toLowerCase();
    if (!key) return;

    if (!mergedByEmail.has(key)) {
      mergedByEmail.set(key, user);
      return;
    }

    const current = mergedByEmail.get(key);
    mergedByEmail.set(key, {
      ...current,
      ...user,
      role: user.role || current.role || "user",
      password: user.password || current.password,
      display_name: user.display_name || current.display_name || user.username,
    });
  });

  return [...mergedByEmail.values()];
}

const handoffUsers = normalizeUsers(readHandoffItems("users.seed.json") || []);

export const DEFAULT_USERS = mergeUsers(FALLBACK_USERS, handoffUsers);

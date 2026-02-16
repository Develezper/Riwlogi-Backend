import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "../..");
const handoffDir = path.join(backendRoot, "docs", "backend-handoff");

const FALLBACK_USERS = [
  {
    id: "user_demo",
    username: "demo",
    email: "demo@riwlog.dev",
    password: "123456",
    display_name: "Demo User",
    created_at: "2026-01-03T10:00:00.000Z",
  },
  {
    id: "user_code_ninja",
    username: "code_ninja",
    email: "code@riwlog.dev",
    password: "123456",
    display_name: "Code Ninja",
    created_at: "2025-11-22T10:00:00.000Z",
  },
];

const FALLBACK_LEADERBOARD = [
  { username: "algorithmist", score: 4850, solved: 87, streak: 32 },
  { username: "code_ninja", score: 4720, solved: 82, streak: 28 },
  { username: "byte_master", score: 4580, solved: 79, streak: 21 },
  { username: "devSara", score: 4320, solved: 74, streak: 18 },
  { username: "logic_lord", score: 4100, solved: 71, streak: 15 },
  { username: "func_wizard", score: 3920, solved: 68, streak: 14 },
  { username: "recursion_queen", score: 3780, solved: 65, streak: 12 },
  { username: "stack_overflow", score: 3650, solved: 62, streak: 11 },
  { username: "dp_guru", score: 3500, solved: 59, streak: 9 },
  { username: "hash_hero", score: 3350, solved: 56, streak: 7 },
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
      display_name: String(entry?.display_name || entry?.username || "").trim(),
      created_at: String(entry?.created_at || ""),
    }))
    .filter((entry) => entry.id && entry.username && entry.email && entry.password);
}

function normalizeLeaderboard(items) {
  return items
    .map((entry) => ({
      username: String(entry?.username || "").trim(),
      score: Number(entry?.score || 0),
      solved: Number(entry?.solved || 0),
      streak: Number(entry?.streak || 0),
    }))
    .filter((entry) => entry.username);
}

const handoffUsers = normalizeUsers(readHandoffItems("users.seed.json") || []);
const handoffLeaderboard = normalizeLeaderboard(readHandoffItems("leaderboard.seed.json") || []);

export const DEFAULT_USERS = handoffUsers.length ? handoffUsers : FALLBACK_USERS;
export const LEADERBOARD_SEED = handoffLeaderboard.length ? handoffLeaderboard : FALLBACK_LEADERBOARD;

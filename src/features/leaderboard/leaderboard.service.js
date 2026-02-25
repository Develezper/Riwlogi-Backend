import { store } from "../../data/store.js";
import { LEADERBOARD_SEED } from "../../data/seeds.js";
import { calculateConsecutiveDailyStreak } from "../../utils/streak.js";
import { z } from "zod";

const timeframeSchema = z.enum(["today", "week", "all"]).catch("all");

function timeframeMatch(dateLike, timeframe) {
  if (timeframe === "all") return true;

  const value = new Date(dateLike);
  if (Number.isNaN(value.getTime())) return false;

  const now = new Date();

  if (timeframe === "today") {
    return value.toDateString() === now.toDateString();
  }

  if (timeframe === "week") {
    const diffMs = now.getTime() - value.getTime();
    return diffMs <= 7 * 24 * 60 * 60 * 1000;
  }

  return true;
}

export function buildLeaderboard(timeframe = "all") {
  const map = new Map();
  const solvedByUser = new Map();
  const submissionsByUser = new Map();

  if (timeframe === "all") {
    LEADERBOARD_SEED.forEach((entry) => {
      map.set(entry.username.toLowerCase(), {
        username: entry.username,
        avatar: entry.username[0].toUpperCase(),
        score: entry.score,
        solved: entry.solved,
        streak: entry.streak,
      });
    });
  }

  const usersById = new Map(store.listUsers().map((user) => [user.id, user]));
  const filteredSubmissions = store
    .listSubmissions()
    .filter((submission) => timeframeMatch(submission.submitted_at || submission.created_at, timeframe));

  filteredSubmissions.forEach((submission) => {
    const user = usersById.get(submission.user_id);
    if (!user) return;

    const key = user.username.toLowerCase();
    const current =
      map.get(key) ||
      {
        username: user.username,
        avatar: user.username[0].toUpperCase(),
        score: 0,
        solved: 0,
        streak: 0,
      };

    current.score += Number(submission.final_score || 0);

    if (!solvedByUser.has(key)) solvedByUser.set(key, new Set());
    if (submission.verdict === "accepted") {
      solvedByUser.get(key).add(submission.problem_id);
    }

    if (!submissionsByUser.has(key)) submissionsByUser.set(key, []);
    submissionsByUser.get(key).push(submission);

    current.solved = Math.max(current.solved, solvedByUser.get(key).size);
    map.set(key, current);
  });

  submissionsByUser.forEach((entries, key) => {
    const current = map.get(key);
    if (!current) return;
    current.streak = Math.max(
      current.streak,
      calculateConsecutiveDailyStreak(entries, (submission) => submission.submitted_at || submission.created_at),
    );
  });

  return [...map.values()]
    .sort((a, b) => b.score - a.score || b.solved - a.solved || a.username.localeCompare(b.username))
    .slice(0, 100)
    .map((entry, index) => ({
      rank: index + 1,
      username: entry.username,
      avatar: entry.avatar,
      score: Math.round(entry.score),
      total_score: Math.round(entry.score),
      solved: entry.solved,
      streak: entry.streak,
    }));
}

export function listLeaderboard({ timeframe = "all" } = {}) {
  const normalized = timeframeSchema.parse(timeframe);
  return buildLeaderboard(normalized);
}

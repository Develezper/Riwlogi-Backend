import { store } from "../../data/store.js";
import { calculateConsecutiveDailyStreak } from "../../utils/streak.js";

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

export async function buildLeaderboard(timeframe = "all") {
  const map = new Map();
  const submissionsByUser = new Map();

  const solvedByUser = new Map();
  const [submissions, users] = await Promise.all([store.listSubmissions(), store.listUsers()]);
  const usersById = new Map(users.map((user) => [user.id, user]));

  submissions
    .filter((submission) =>
      timeframeMatch(
        submission.submitted_at || submission.created_at,
        timeframe,
      ),
    )
    .forEach((submission) => {
      const user = usersById.get(submission.user_id);
      if (!user) return;

      const key = user.username.toLowerCase();
      const current = map.get(key) || {
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
        if (!submissionsByUser.has(key)) submissionsByUser.set(key, []);
        submissionsByUser.get(key).push(submission);
      }

      current.solved = Math.max(current.solved, solvedByUser.get(key).size);
      map.set(key, current);
    });

  submissionsByUser.forEach((userSubmissions, key) => {
    const current = map.get(key);
    if (!current) return;

    current.streak = calculateConsecutiveDailyStreak(
      userSubmissions,
      (submission) => submission.submitted_at || submission.created_at,
    );

    map.set(key, current);
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

export async function listLeaderboard({ timeframe = "all" } = {}) {
  const normalized = ["today", "week", "all"].includes(timeframe) ? timeframe : "all";
  return buildLeaderboard(normalized);
}

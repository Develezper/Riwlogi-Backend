import { store } from "../../data/store.js";
import { calculateConsecutiveDailyStreak } from "../../utils/streak.js";
import { paginateItems } from "../../utils/pagination.js";

const MAX_LEADERBOARD_ENTRIES = 100;

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

function isPostgresStore() {
  return store?.provider === "postgres" && store?.pool;
}

function timeframeClause(timeframe) {
  if (timeframe === "today") {
    return "COALESCE(s.submitted_at, s.created_at) >= NOW() - INTERVAL '1 day'";
  }
  if (timeframe === "week") {
    return "COALESCE(s.submitted_at, s.created_at) >= NOW() - INTERVAL '7 days'";
  }
  return "TRUE";
}

async function listLeaderboardPageFromPostgres({ timeframe, page, limit }) {
  const safePage = Math.max(1, Number(page || 1));
  const safeLimit = Math.max(1, Number(limit || 20));
  const offset = (safePage - 1) * safeLimit;
  const clause = timeframeClause(timeframe);

  const entriesResult = await store.pool.query(
    `
      WITH ranked AS (
        SELECT
          u.id AS user_id,
          u.username AS username,
          COALESCE(SUM(s.final_score), 0)::int AS score,
          COUNT(DISTINCT CASE WHEN s.verdict = 'accepted' THEN s.problem_id END)::int AS solved,
          row_number() OVER (
            ORDER BY COALESCE(SUM(s.final_score), 0) DESC,
            COUNT(DISTINCT CASE WHEN s.verdict = 'accepted' THEN s.problem_id END) DESC,
            lower(u.username) ASC
          )::int AS rank
        FROM users u
        LEFT JOIN submissions s
          ON s.user_id = u.id
          AND ${clause}
        GROUP BY u.id, u.username
        HAVING COALESCE(SUM(s.final_score), 0) > 0
           OR COUNT(CASE WHEN s.id IS NOT NULL THEN 1 END) > 0
      )
      SELECT user_id, username, score, solved, rank
      FROM ranked
      WHERE rank <= $1
      ORDER BY rank ASC
      LIMIT $2 OFFSET $3
    `,
    [MAX_LEADERBOARD_ENTRIES, safeLimit, offset],
  );

  const totalResult = await store.pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT u.id
        FROM users u
        LEFT JOIN submissions s
          ON s.user_id = u.id
          AND ${clause}
        GROUP BY u.id
        HAVING COALESCE(SUM(s.final_score), 0) > 0
           OR COUNT(CASE WHEN s.id IS NOT NULL THEN 1 END) > 0
        ORDER BY COALESCE(SUM(s.final_score), 0) DESC
        LIMIT $1
      ) ranked
    `,
    [MAX_LEADERBOARD_ENTRIES],
  );

  const items = (entriesResult.rows || []).map((row) => ({
    user_id: String(row.user_id || ""),
    rank: Number(row.rank || 0),
    username: String(row.username || "Usuario"),
    avatar: String(row.username || "U")[0].toUpperCase(),
    score: Number(row.score || 0),
    total_score: Number(row.score || 0),
    solved: Number(row.solved || 0),
    streak: 0,
  }));

  if (items.length) {
    const userIds = items.map((item) => item.user_id);
    const streakResult = await store.pool.query(
      `
        SELECT user_id, submitted_at, created_at
        FROM submissions
        WHERE verdict = 'accepted'
          AND user_id = ANY($1)
          AND ${clause.replaceAll("s.", "")}
      `,
      [userIds],
    );

    const byUserId = new Map();
    (streakResult.rows || []).forEach((row) => {
      const key = String(row.user_id || "");
      if (!byUserId.has(key)) byUserId.set(key, []);
      byUserId.get(key).push({
        submitted_at: row.submitted_at,
        created_at: row.created_at,
      });
    });

    items.forEach((item) => {
      item.streak = calculateConsecutiveDailyStreak(
        byUserId.get(item.user_id) || [],
        (submission) => submission.submitted_at || submission.created_at,
      );
      delete item.user_id;
    });
  }

  const total = Number(totalResult.rows?.[0]?.total || 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);
  const resolvedPage = totalPages === 0 ? 1 : Math.min(safePage, totalPages);

  return {
    items,
    page: resolvedPage,
    limit: safeLimit,
    total,
    total_pages: totalPages,
    has_prev: totalPages > 0 && resolvedPage > 1,
    has_next: totalPages > 0 && resolvedPage < totalPages,
  };
}

export async function listLeaderboard({ timeframe = "all" } = {}) {
  const normalized = ["today", "week", "all"].includes(timeframe) ? timeframe : "all";
  return buildLeaderboard(normalized);
}

export async function listLeaderboardPage({ timeframe = "all", page = 1, limit = 20 } = {}) {
  const normalized = ["today", "week", "all"].includes(timeframe) ? timeframe : "all";

  if (!isPostgresStore()) {
    const allItems = await buildLeaderboard(normalized);
    return paginateItems(allItems.slice(0, MAX_LEADERBOARD_ENTRIES), { page, limit });
  }

  return listLeaderboardPageFromPostgres({
    timeframe: normalized,
    page,
    limit,
  });
}

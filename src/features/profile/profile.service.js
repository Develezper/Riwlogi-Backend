import { getProblemBySlug } from "../../data/problem-catalog.js";
import { store } from "../../data/store.js";
import { HttpError } from "../../utils/http-error.js";
import { buildLeaderboard } from "../leaderboard/leaderboard.service.js";

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    display_name: user.display_name || user.username,
    created_at: user.created_at,
  };
}

function calculateStreak(submissions) {
  if (!submissions.length) return 0;

  const days = new Set(
    submissions.map((submission) => {
      const date = new Date(submission.submitted_at || submission.created_at);
      return date.toISOString().slice(0, 10);
    }),
  );

  let streak = 0;
  const cursor = new Date();

  for (let index = 0; index < 60; index += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function computeDifficultyStats(problemIds) {
  const counts = { easy: 0, medium: 0, hard: 0 };

  problemIds.forEach((problemId) => {
    const problem = getProblemBySlug(problemId);
    if (!problem) return;
    if (problem.difficulty === 1) counts.easy += 1;
    if (problem.difficulty === 2) counts.medium += 1;
    if (problem.difficulty === 3) counts.hard += 1;
  });

  return counts;
}

function buildBadges({ solved, hardSolved, streak, totalScore }) {
  const badges = [];

  if (solved >= 1) badges.push({ name: "First Solve", description: "Resolved your first challenge", icon: "check-circle" });
  if (solved >= 5) badges.push({ name: "Consistency", description: "Solved 5+ different problems", icon: "award" });
  if (hardSolved >= 3) badges.push({ name: "Hard Crusher", description: "Solved 3 hard challenges", icon: "trophy" });
  if (streak >= 7) badges.push({ name: "Streak Master", description: "Maintained a 7-day streak", icon: "flame" });
  if (totalScore >= 1000) badges.push({ name: "Speed Demon", description: "Reached 1000+ total points", icon: "zap" });

  if (!badges.length) {
    badges.push({ name: "Getting Started", description: "Complete your first submission", icon: "award" });
  }

  return badges;
}

function formatSubmission(submission) {
  return {
    id: submission.id,
    problem_id: submission.problem_id,
    problem_title: submission.problem_title,
    verdict: submission.verdict,
    language: submission.language,
    final_score: Number(submission.final_score || 0),
    runtime_ms: Number(submission.runtime_ms || 0),
    submitted_at: submission.submitted_at || submission.created_at,
    stage_results: submission.stage_results,
  };
}

export function getProfile(userId) {
  const user = store.findUserById(userId);
  if (!user) {
    throw new HttpError(404, "Usuario no encontrado.");
  }

  const submissions = store.listSubmissionsByUser(userId);

  const acceptedProblemIds = new Set(
    submissions
      .filter((submission) => submission.verdict === "accepted")
      .map((submission) => submission.problem_id),
  );

  const difficultyStats = computeDifficultyStats(acceptedProblemIds);
  const totalScore = submissions.reduce((acc, submission) => acc + Number(submission.final_score || 0), 0);
  const solved = acceptedProblemIds.size;
  const streak = calculateStreak(submissions);
  const leaderboard = buildLeaderboard("all");
  const rank =
    leaderboard.find((entry) => entry.username.toLowerCase() === user.username.toLowerCase())?.rank ||
    leaderboard.length + 1;

  const badges = buildBadges({
    solved,
    hardSolved: difficultyStats.hard,
    streak,
    totalScore,
  });

  return {
    user: toPublicUser(user),
    stats: {
      total_score: totalScore,
      solved,
      by_difficulty: difficultyStats,
    },
    streak,
    rank,
    badges,
  };
}

export function getProfileSubmissions(userId) {
  return store
    .listSubmissionsByUser(userId)
    .slice()
    .sort(
      (a, b) =>
        new Date(b.submitted_at || b.created_at).getTime() -
        new Date(a.submitted_at || a.created_at).getTime(),
    )
    .map(formatSubmission);
}

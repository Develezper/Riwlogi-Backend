import { getAllProblems } from "../../data/problem-catalog.js";
import { store } from "../../data/store.js";
import { HttpError } from "../../utils/http-error.js";
import { calculateConsecutiveDailyStreak } from "../../utils/streak.js";
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

function computeDifficultyStats(problemIds, byId) {
  const counts = { easy: 0, medium: 0, hard: 0 };

  problemIds.forEach((problemId) => {
    const problem = byId.get(String(problemId || "").toLowerCase());
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

export async function getProfile(userId) {
  const user = await store.findUserById(userId);
  if (!user) {
    throw new HttpError(404, "Usuario no encontrado.");
  }

  const submissions = await store.listSubmissionsByUser(userId);

  const acceptedProblemIds = new Set(
    submissions
      .filter((submission) => submission.verdict === "accepted")
      .map((submission) => submission.problem_id),
  );

  const problems = await getAllProblems();
  const problemsById = new Map(
    problems.map((problem) => [String(problem.id || problem.slug || "").toLowerCase(), problem]),
  );

  const difficultyStats = computeDifficultyStats(acceptedProblemIds, problemsById);
  const totalScore = submissions.reduce((acc, submission) => acc + Number(submission.final_score || 0), 0);
  const solved = acceptedProblemIds.size;
  const streak = calculateConsecutiveDailyStreak(
    submissions,
    (submission) => submission.submitted_at || submission.created_at,
    { maxLookbackDays: 60 },
  );
  const leaderboard = await buildLeaderboard("all");
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

export async function getProfileSubmissions(userId) {
  const submissions = await store.listSubmissionsByUser(userId);
  return submissions
    .slice()
    .sort(
      (a, b) =>
        new Date(b.submitted_at || b.created_at).getTime() -
        new Date(a.submitted_at || a.created_at).getTime(),
    )
    .map(formatSubmission);
}

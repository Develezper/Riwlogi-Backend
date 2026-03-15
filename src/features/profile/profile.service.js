import { getAllProblems } from "../../data/problem-catalog.js";
import { store } from "../../data/store.js";
import { HttpError } from "../../utils/http-error.js";
import { calculateConsecutiveDailyStreak } from "../../utils/streak.js";

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

  if (solved >= 1)
    badges.push({
      name: "Primer ejercicio resuelto",
      description: "Completaste tu primer reto.",
      icon: "check-circle",
    });
  if (solved >= 5)
    badges.push({
      name: "Constancia",
      description: "Resolviste 5 o mas ejercicios distintos.",
      icon: "award",
    });
  if (hardSolved >= 3)
    badges.push({
      name: "Dominio avanzado",
      description: "Resolviste 3 ejercicios dificiles.",
      icon: "trophy",
    });
  if (streak >= 7)
    badges.push({
      name: "Racha de fuego",
      description: "Mantuviste una racha de 7 dias.",
      icon: "flame",
    });
  if (totalScore >= 1000)
    badges.push({
      name: "Puntaje elite",
      description: "Superaste los 1000 puntos acumulados.",
      icon: "zap",
    });

  if (!badges.length) {
    badges.push({
      name: "Primeros pasos",
      description: "Completa tu primer envio para desbloquear insignias.",
      icon: "award",
    });
  }

  return badges;
}

function isSubmittedSubmission(submission) {
  const verdict = String(submission?.verdict || "")
    .trim()
    .toLowerCase();
  if (verdict && verdict !== "pending") return true;
  const submittedAt = new Date(submission?.submitted_at).getTime();
  return Number.isFinite(submittedAt) && submittedAt > 0;
}

function getSolveDurationMs(submission) {
  const createdAt = new Date(submission?.created_at).getTime();
  const submittedAt = new Date(submission?.submitted_at).getTime();
  if (!Number.isFinite(createdAt) || !Number.isFinite(submittedAt)) return null;
  if (submittedAt < createdAt) return null;
  return submittedAt - createdAt;
}

function buildUserRanking(users, submissions) {
  const scoreByUserId = new Map(users.map((user) => [String(user.id || ""), 0]));

  submissions.filter(isSubmittedSubmission).forEach((submission) => {
    const userId = String(submission.user_id || "");
    if (!scoreByUserId.has(userId)) return;
    scoreByUserId.set(userId, scoreByUserId.get(userId) + Number(submission.final_score || 0));
  });

  const sorted = users
    .slice()
    .sort((a, b) => {
      const scoreA = scoreByUserId.get(String(a.id || "")) || 0;
      const scoreB = scoreByUserId.get(String(b.id || "")) || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return String(a.username || "").localeCompare(String(b.username || ""));
    })
    .map((user, index) => ({ userId: String(user.id || ""), rank: index + 1 }));

  return new Map(sorted.map((entry) => [entry.userId, entry.rank]));
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
    solve_duration_ms: getSolveDurationMs(submission),
    stage_results: submission.stage_results,
  };
}

export async function getProfile(userId) {
  const user = await store.findUserById(userId);
  if (!user) {
    throw new HttpError(404, "Usuario no encontrado.");
  }

  const [submissions, allUsers, allSubmissions] = await Promise.all([
    store.listSubmissionsByUser(userId),
    store.listUsers(),
    store.listSubmissions(),
  ]);

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
  const rankByUserId = buildUserRanking(allUsers, allSubmissions);
  const rank = rankByUserId.get(String(user.id || "")) || allUsers.length;

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
      total_problems: problems.length,
      by_difficulty: difficultyStats,
    },
    streak,
    rank,
    total_users: allUsers.length,
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

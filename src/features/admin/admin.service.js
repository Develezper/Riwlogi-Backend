import { store } from "../../data/store.js";
import { getAllProblems, getProblemBySlug } from "../../data/problem-catalog.js";
import { HttpError } from "../../utils/http-error.js";
import { nowIso } from "../../utils/time.js";

function toAdminUser(user, submissions = []) {
    const userSubmissions = submissions.filter((s) => s.user_id === user.id);
    const accepted = new Set(
        userSubmissions
            .filter((s) => s.verdict === "accepted")
            .map((s) => s.problem_id)
    );

    return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || "user",
        is_admin: user.role === "admin",
        display_name: user.display_name || user.username,
        created_at: user.created_at,
        submissions_count: userSubmissions.length,
        solved_count: accepted.size,
        last_active_at: userSubmissions.length
            ? userSubmissions[userSubmissions.length - 1].created_at
            : null,
    };
}

function toAdminProblem(problem) {
    return {
        ...problem,
        status: problem.status || "published",
        source: problem.source || "custom",
        ai_generated: problem.source === "ai",
        created_at: problem.created_at || nowIso(),
        updated_at: problem.updated_at || nowIso(),
        last_generated_prompt: problem.last_generated_prompt || "",
    };
}

export function getAdminOverview() {
    const users = store.getUsers();
    const submissions = store.listSubmissions();
    const problems = getAllProblems();

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const activeUsers = new Set(
        submissions
            .filter((s) => new Date(s.created_at).getTime() > sevenDaysAgo)
            .map((s) => s.user_id)
    );

    const acceptedCount = submissions.filter((s) => s.verdict === "accepted").length;
    const acceptanceRate = submissions.length > 0
        ? (acceptedCount / submissions.length) * 100
        : 0;

    const tagCounts = new Map();
    problems.forEach((problem) => {
        (problem.tags || []).forEach((tag) => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
    });

    const topTags = [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));

    const recentActivity = submissions
        .slice(-20)
        .reverse()
        .map((s, index) => ({
            id: s.id || `activity_${index}`,
            type: s.verdict === "accepted" ? "submission_accepted" : "submission",
            label: `${s.problem_title} by user ${s.user_id}`,
            created_at: s.submitted_at || s.created_at,
        }));

    return {
        kpis: {
            total_users: users.length,
            active_users_7d: activeUsers.size,
            total_problems: problems.length,
            published_problems: problems.length,
            draft_problems: 0,
            total_submissions: submissions.length,
            accepted_submissions: acceptedCount,
            acceptance_rate: Math.round(acceptanceRate),
            ai_generated_problems: 0,
        },
        top_tags: topTags,
        recent_activity: recentActivity,
        updated_at: nowIso(),
    };
}

export function listAdminUsers() {
    const users = store.getUsers();
    const submissions = store.listSubmissions();
    return users.map((user) => toAdminUser(user, submissions));
}

export function deleteAdminUser({ userId }) {
    const users = store.getUsers();
    const index = users.findIndex((u) => u.id === userId);

    if (index === -1) {
        throw new HttpError(404, "Usuario no encontrado.");
    }

    users.splice(index, 1);
    return { ok: true };
}

export function listAdminProblems() {
    return getAllProblems().map(toAdminProblem);
}

export function generateAdminProblem({ prompt }) {
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 10) {
        throw new HttpError(400, "El prompt debe tener al menos 10 caracteres.");
    }

    // Mock: en producción integrarías con una API de IA
    const mockProblem = {
        id: `ai-generated-${Date.now()}`,
        slug: `ai-generated-${Date.now()}`,
        title: "AI Generated Problem (Mock)",
        difficulty: 2,
        tags: ["ai-generated"],
        acceptance: 0,
        submissions: 0,
        stages_count: 1,
        statement_md: "## AI Generated Problem\n\nThis is a mock problem generated from the prompt.",
        starter_code: {
            python: "def solve():\n    # AI generated solution\n    pass",
            javascript: "function solve() {\n  // AI generated solution\n}",
        },
        stages: [
            {
                id: `ai-stage-${Date.now()}`,
                stage_index: 1,
                prompt_md: "Solve the AI-generated challenge.",
                visible_tests: [],
                hidden_count: 0,
            },
        ],
        status: "draft",
        source: "ai",
        ai_generated: true,
        last_generated_prompt: prompt,
        created_at: nowIso(),
        updated_at: nowIso(),
    };

    return mockProblem;
}

export function updateAdminProblem({ problemId, updates }) {
    const problem = getProblemBySlug(problemId);

    if (!problem) {
        throw new HttpError(404, "Problema no encontrado.");
    }

    // Mock: en producción actualizarías la DB
    return {
        ...problem,
        ...updates,
        updated_at: nowIso(),
    };
}

export function deleteAdminProblem({ problemId }) {
    const problem = getProblemBySlug(problemId);

    if (!problem) {
        throw new HttpError(404, "Problema no encontrado.");
    }

    // Mock: en producción eliminarías de la DB
    return { ok: true };
}

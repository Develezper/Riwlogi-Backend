import {
    deleteAdminProblem,
    deleteAdminUser,
    generateAdminProblem,
    getAdminOverview,
    listAdminProblems,
    listAdminUsers,
    updateAdminProblem,
} from "./admin.service.js";

export function getAdminOverviewController(req, res) {
    const data = getAdminOverview();
    res.json({ item: data });
}

export function listAdminUsersController(req, res) {
    const items = listAdminUsers();
    res.json({ items });
}

export function deleteAdminUserController(req, res) {
    const result = deleteAdminUser({
        userId: req.params?.id,
        requestedByUserId: req.auth?.userId,
    });
    res.json(result);
}

export function listAdminProblemsController(req, res) {
    const items = listAdminProblems();
    res.json({ items });
}

export function generateAdminProblemController(req, res) {
    const problem = generateAdminProblem({ prompt: req.body?.prompt });
    res.status(201).json({ item: problem });
}

export function updateAdminProblemController(req, res) {
    const problem = updateAdminProblem({
        problemId: req.params?.id,
        updates: req.body,
    });
    res.json({ item: problem });
}

export function deleteAdminProblemController(req, res) {
    const result = deleteAdminProblem({ problemId: req.params?.id });
    res.json(result);
}

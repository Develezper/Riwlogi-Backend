import { HttpError } from "../../utils/http-error.js";
import {
    deleteAdminProblem,
    deleteAdminUser,
    generateAdminProblem,
    getAdminOverview,
    listAdminProblems,
    listAdminUsers,
    updateAdminProblem,
} from "./admin.service.js";

function requireAdmin(req) {
    if (!req.auth || !req.auth.user) {
        throw new HttpError(401, "No autenticado.");
    }

    if (req.auth.user.role !== "admin") {
        throw new HttpError(403, "Acceso denegado. Se requiere rol de administrador.");
    }
}

export function getAdminOverviewController(req, res) {
    requireAdmin(req);
    const data = getAdminOverview();
    res.json({ item: data });
}

export function listAdminUsersController(req, res) {
    requireAdmin(req);
    const items = listAdminUsers();
    res.json({ items });
}

export function deleteAdminUserController(req, res) {
    requireAdmin(req);
    const result = deleteAdminUser({ userId: req.params?.id });
    res.json(result);
}

export function listAdminProblemsController(req, res) {
    requireAdmin(req);
    const items = listAdminProblems();
    res.json({ items });
}

export function generateAdminProblemController(req, res) {
    requireAdmin(req);
    const problem = generateAdminProblem({ prompt: req.body?.prompt });
    res.status(201).json({ item: problem });
}

export function updateAdminProblemController(req, res) {
    requireAdmin(req);
    const problem = updateAdminProblem({
        problemId: req.params?.id,
        updates: req.body,
    });
    res.json({ item: problem });
}

export function deleteAdminProblemController(req, res) {
    requireAdmin(req);
    const result = deleteAdminProblem({ problemId: req.params?.id });
    res.json(result);
}

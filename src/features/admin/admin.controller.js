import {
  deleteAdminProblem,
  deleteAdminUser,
  generateAdminProblem,
  getAdminOverview,
  listAdminProblems,
  listAdminUsers,
  updateAdminProblem,
} from "./admin.service.js";
import { paginateItems, parsePaginationQuery } from "../../utils/pagination.js";

export async function getAdminOverviewController(req, res) {
  const data = await getAdminOverview();
  res.json({ item: data });
}

export async function listAdminUsersController(req, res) {
  const allItems = await listAdminUsers();
  const pagination = parsePaginationQuery(req.query);
  const payload = paginateItems(allItems, pagination);
  res.json(payload);
}

export async function deleteAdminUserController(req, res) {
  const result = await deleteAdminUser({
    userId: req.params?.id,
    requestedByUserId: req.auth?.userId,
  });
  res.json(result);
}

export async function listAdminProblemsController(req, res) {
  const allItems = await listAdminProblems();
  const pagination = parsePaginationQuery(req.query);
  const payload = paginateItems(allItems, pagination);
  res.json(payload);
}

export async function generateAdminProblemController(req, res) {
  const problem = await generateAdminProblem({ prompt: req.body?.prompt });
  res.status(201).json({ item: problem });
}

export async function updateAdminProblemController(req, res) {
  const problem = await updateAdminProblem({
    problemId: req.params?.id,
    updates: req.body,
  });
  res.json({ item: problem });
}

export async function deleteAdminProblemController(req, res) {
  const result = await deleteAdminProblem({ problemId: req.params?.id });
  res.json(result);
}

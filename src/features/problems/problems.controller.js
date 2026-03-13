import { getProblem, listProblems, listTags } from "./problems.service.js";
import { paginateItems, parsePaginationQuery } from "../../utils/pagination.js";

export async function listProblemsController(req, res) {
  const allItems = await listProblems({
    difficulty: req.query?.difficulty,
    search: req.query?.search,
    tag: req.query?.tag,
  });
  const pagination = parsePaginationQuery(req.query);
  const payload = paginateItems(allItems, pagination);

  res.json(payload);
}

export async function getProblemController(req, res) {
  const item = await getProblem(req.params?.slug);
  res.json({ item });
}

export async function listTagsController(_req, res) {
  res.json({ items: await listTags() });
}

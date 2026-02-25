import { getProblem, listProblems, listTags } from "./problems.service.js";
import { paginateItems, parsePaginationQuery } from "../../utils/pagination.js";

export function listProblemsController(req, res) {
  const allItems = listProblems({
    difficulty: req.query?.difficulty,
    search: req.query?.search,
    tag: req.query?.tag,
  });
  const pagination = parsePaginationQuery(req.query);
  const payload = paginateItems(allItems, pagination);

  res.json(payload);
}

export function getProblemController(req, res) {
  const item = getProblem(req.params?.slug);
  res.json({ item });
}

export function listTagsController(_req, res) {
  res.json({ items: listTags() });
}

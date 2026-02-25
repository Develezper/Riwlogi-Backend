import { getProblem, listProblems, listTags } from "./problems.service.js";

export function listProblemsController(req, res) {
  const items = listProblems({
    difficulty: req.query?.difficulty,
    search: req.query?.search,
    tag: req.query?.tag,
  });

  res.json({ items });
}

export function getProblemController(req, res) {
  const item = getProblem(req.params?.slug);
  res.json({ item });
}

export function listTagsController(_req, res) {
  res.json({ items: listTags() });
}

import { z } from "zod";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const paginationQuerySchema = z.any().transform((value) => {
  const query = value && typeof value === "object" ? value : {};
  const parsedPage = Number(query.page);
  const parsedLimit = Number(query.limit);

  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : DEFAULT_PAGE;
  const rawLimit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : DEFAULT_LIMIT;
  const limit = Math.min(rawLimit, MAX_LIMIT);

  return { page, limit };
});

export function parsePaginationQuery(query) {
  return paginationQuerySchema.parse(query);
}

export function paginateItems(items, { page, limit }) {
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const safePage = totalPages === 0 ? DEFAULT_PAGE : Math.min(page, totalPages);
  const start = (safePage - 1) * limit;

  return {
    items: items.slice(start, start + limit),
    page: safePage,
    limit,
    total,
    total_pages: totalPages,
    has_prev: totalPages > 0 && safePage > 1,
    has_next: totalPages > 0 && safePage < totalPages,
  };
}

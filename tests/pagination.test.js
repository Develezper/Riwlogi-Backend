import { describe, expect, it } from "bun:test";
import { paginateItems, parsePaginationQuery } from "../src/utils/pagination.js";

describe("pagination utils", () => {
  it("uses defaults when query values are missing or invalid", () => {
    expect(parsePaginationQuery({})).toEqual({ page: 1, limit: 20 });
    expect(parsePaginationQuery({ page: "0", limit: "-2" })).toEqual({ page: 1, limit: 20 });
    expect(parsePaginationQuery({ page: "abc", limit: "xyz" })).toEqual({ page: 1, limit: 20 });
  });

  it("caps limit at 100", () => {
    expect(parsePaginationQuery({ page: "2", limit: "999" })).toEqual({ page: 2, limit: 100 });
  });

  it("returns paginated items with metadata", () => {
    const items = Array.from({ length: 45 }, (_, index) => ({ id: index + 1 }));
    const result = paginateItems(items, { page: 2, limit: 20 });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(20);
    expect(result.total).toBe(45);
    expect(result.total_pages).toBe(3);
    expect(result.has_prev).toBe(true);
    expect(result.has_next).toBe(true);
    expect(result.items.length).toBe(20);
    expect(result.items[0].id).toBe(21);
  });

  it("handles empty collections", () => {
    const result = paginateItems([], { page: 5, limit: 20 });

    expect(result.page).toBe(1);
    expect(result.total).toBe(0);
    expect(result.total_pages).toBe(0);
    expect(result.has_prev).toBe(false);
    expect(result.has_next).toBe(false);
    expect(result.items).toEqual([]);
  });
});

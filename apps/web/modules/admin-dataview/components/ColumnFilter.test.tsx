import { endOfDay, startOfDay } from "date-fns";
import { describe, expect, it } from "vitest";

import type { ColumnFilterValue } from "./ColumnFilter";
import { filterToPrismaWhere } from "./ColumnFilter";

describe("filterToPrismaWhere – datetime filters", () => {
  it("generates 'before' filter using startOfDay", () => {
    const filter: ColumnFilterValue = {
      type: "datetime",
      operator: "before",
      value: "2025-06-15T12:00:00.000Z",
    };
    const result = filterToPrismaWhere("createdAt", filter);
    expect(result).toEqual({
      createdAt: { lt: startOfDay(new Date("2025-06-15T12:00:00.000Z")) },
    });
  });

  it("generates 'after' filter using endOfDay", () => {
    const filter: ColumnFilterValue = {
      type: "datetime",
      operator: "after",
      value: "2025-06-15T12:00:00.000Z",
    };
    const result = filterToPrismaWhere("createdAt", filter);
    expect(result).toEqual({
      createdAt: { gt: endOfDay(new Date("2025-06-15T12:00:00.000Z")) },
    });
  });

  it("generates 'on' filter with startOfDay to endOfDay range", () => {
    const filter: ColumnFilterValue = {
      type: "datetime",
      operator: "on",
      value: "2025-06-15T12:00:00.000Z",
    };
    const result = filterToPrismaWhere("updatedAt", filter);
    const d = new Date("2025-06-15T12:00:00.000Z");
    expect(result).toEqual({
      updatedAt: {
        gte: startOfDay(d),
        lte: endOfDay(d),
      },
    });
  });

  it("generates 'between' filter with two dates", () => {
    const filter: ColumnFilterValue = {
      type: "datetime",
      operator: "between",
      value: "2025-06-01T00:00:00.000Z",
      valueTo: "2025-06-30T00:00:00.000Z",
    };
    const result = filterToPrismaWhere("createdAt", filter);
    expect(result).toEqual({
      createdAt: {
        gte: startOfDay(new Date("2025-06-01T00:00:00.000Z")),
        lte: endOfDay(new Date("2025-06-30T00:00:00.000Z")),
      },
    });
  });

  it("generates 'between' filter falling back to value when valueTo is missing", () => {
    const filter: ColumnFilterValue = {
      type: "datetime",
      operator: "between",
      value: "2025-06-01T00:00:00.000Z",
    };
    const result = filterToPrismaWhere("createdAt", filter);
    expect(result).toEqual({
      createdAt: {
        gte: startOfDay(new Date("2025-06-01T00:00:00.000Z")),
        lte: endOfDay(new Date("2025-06-01T00:00:00.000Z")),
      },
    });
  });

  it("generates 'isEmpty' filter as null check", () => {
    const filter: ColumnFilterValue = {
      type: "datetime",
      operator: "isEmpty",
      value: "",
    };
    const result = filterToPrismaWhere("deletedAt", filter);
    expect(result).toEqual({ deletedAt: { equals: null } });
  });

  it("generates 'isNotEmpty' filter as NOT null", () => {
    const filter: ColumnFilterValue = {
      type: "datetime",
      operator: "isNotEmpty",
      value: "",
    };
    const result = filterToPrismaWhere("deletedAt", filter);
    expect(result).toEqual({ NOT: { deletedAt: null } });
  });
});

describe("filterToPrismaWhere – existing filter types still work", () => {
  it("handles text contains filter", () => {
    const filter: ColumnFilterValue = { type: "text", operator: "contains", value: "test" };
    expect(filterToPrismaWhere("name", filter)).toEqual({
      name: { contains: "test", mode: "insensitive" },
    });
  });

  it("handles number eq filter", () => {
    const filter: ColumnFilterValue = { type: "number", operator: "eq", value: 42 };
    expect(filterToPrismaWhere("age", filter)).toEqual({ age: { equals: 42 } });
  });

  it("handles boolean filter", () => {
    const filter: ColumnFilterValue = { type: "boolean", value: true };
    expect(filterToPrismaWhere("active", filter)).toEqual({ active: true });
  });

  it("handles enum filter", () => {
    const filter: ColumnFilterValue = { type: "enum", values: ["A", "B"] };
    expect(filterToPrismaWhere("status", filter)).toEqual({ status: { in: ["A", "B"] } });
  });

  it("handles null filter (isNull)", () => {
    const filter: ColumnFilterValue = { type: "null", isNull: true };
    expect(filterToPrismaWhere("field", filter)).toEqual({ field: null });
  });

  it("handles null filter (isNotNull)", () => {
    const filter: ColumnFilterValue = { type: "null", isNull: false };
    expect(filterToPrismaWhere("field", filter)).toEqual({ NOT: { field: null } });
  });
});

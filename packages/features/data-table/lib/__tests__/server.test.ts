import { Prisma } from "@calcom/prisma/client";
import { describe, expect, it } from "vitest";
import { makeSqlCondition } from "../server";
import type {
  MultiSelectFilterValue,
  NumberFilterValue,
  SingleSelectFilterValue,
  TextFilterValue,
} from "../types";
import { ColumnFilterType } from "../types";

describe("makeSqlCondition", () => {
  describe("Multi-select filter values", () => {
    it("should create ANY condition for multi-select values", () => {
      const filterValue: MultiSelectFilterValue = {
        type: ColumnFilterType.MULTI_SELECT,
        data: ["option1", "option2", "option3"],
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`= ANY(${["option1", "option2", "option3"]})`);
    });

    it("should work with table alias", () => {
      const filterValue: MultiSelectFilterValue = {
        type: ColumnFilterType.MULTI_SELECT,
        data: [1, 2, 3],
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`= ANY(${[1, 2, 3]})`);
    });
  });

  describe("Single-select filter values", () => {
    it("should create equals condition for single-select values", () => {
      const filterValue: SingleSelectFilterValue = {
        type: ColumnFilterType.SINGLE_SELECT,
        data: "option1",
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`= ${"option1"}`);
    });

    it("should work with numeric values", () => {
      const filterValue: SingleSelectFilterValue = {
        type: ColumnFilterType.SINGLE_SELECT,
        data: 123,
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`= ${123}`);
    });
  });

  describe("Text filter values", () => {
    it("should create equals condition", () => {
      const filterValue: TextFilterValue = {
        type: ColumnFilterType.TEXT,
        data: { operator: "equals", operand: "test" },
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`= ${"test"}`);
    });

    it("should create not equals condition", () => {
      const filterValue: TextFilterValue = {
        type: ColumnFilterType.TEXT,
        data: { operator: "notEquals", operand: "test" },
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`!= ${"test"}`);
    });

    it("should create contains condition", () => {
      const filterValue: TextFilterValue = {
        type: ColumnFilterType.TEXT,
        data: { operator: "contains", operand: "test" },
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`ILIKE ${`%test%`}`);
    });

    it("should create not contains condition", () => {
      const filterValue: TextFilterValue = {
        type: ColumnFilterType.TEXT,
        data: { operator: "notContains", operand: "test" },
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`NOT ILIKE ${`%test%`}`);
    });

    it("should create starts with condition", () => {
      const filterValue: TextFilterValue = {
        type: ColumnFilterType.TEXT,
        data: { operator: "startsWith", operand: "test" },
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`ILIKE ${`test%`}`);
    });

    it("should create ends with condition", () => {
      const filterValue: TextFilterValue = {
        type: ColumnFilterType.TEXT,
        data: { operator: "endsWith", operand: "test" },
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`ILIKE ${`%test`}`);
    });

    it("should create is empty condition", () => {
      const filterValue: TextFilterValue = {
        type: ColumnFilterType.TEXT,
        data: { operator: "isEmpty", operand: "" },
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`= ''`);
    });

    it("should create is not empty condition", () => {
      const filterValue: TextFilterValue = {
        type: ColumnFilterType.TEXT,
        data: { operator: "isNotEmpty", operand: "" },
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`!= ''`);
    });

    it("should return null for unknown text operator", () => {
      const filterValue: TextFilterValue = {
        type: ColumnFilterType.TEXT,
        data: { operator: "unknown" as any, operand: "test" },
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toBeNull();
    });
  });

  describe("Number filter values", () => {
    it("should create equals condition", () => {
      const filterValue: NumberFilterValue = {
        type: ColumnFilterType.NUMBER,
        data: { operator: "eq", operand: 42 },
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`= ${42}`);
    });

    it("should create not equals condition", () => {
      const filterValue: NumberFilterValue = {
        type: ColumnFilterType.NUMBER,
        data: { operator: "neq", operand: 42 },
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`!= ${42}`);
    });

    it("should create greater than condition", () => {
      const filterValue: NumberFilterValue = {
        type: ColumnFilterType.NUMBER,
        data: { operator: "gt", operand: 42 },
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`> ${42}`);
    });

    it("should create greater than or equal condition", () => {
      const filterValue: NumberFilterValue = {
        type: ColumnFilterType.NUMBER,
        data: { operator: "gte", operand: 42 },
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`>= ${42}`);
    });

    it("should create less than condition", () => {
      const filterValue: NumberFilterValue = {
        type: ColumnFilterType.NUMBER,
        data: { operator: "lt", operand: 42 },
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`< ${42}`);
    });

    it("should create less than or equal condition", () => {
      const filterValue: NumberFilterValue = {
        type: ColumnFilterType.NUMBER,
        data: { operator: "lte", operand: 42 },
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`<= ${42}`);
    });

    it("should return null for unknown number operator", () => {
      const filterValue: NumberFilterValue = {
        type: ColumnFilterType.NUMBER,
        data: { operator: "unknown" as any, operand: 42 },
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("should return null for unknown filter type", () => {
      const filterValue = {
        type: "unknown" as any,
        data: "test",
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toBeNull();
    });

    it("should handle empty multi-select array", () => {
      const filterValue: MultiSelectFilterValue = {
        type: ColumnFilterType.MULTI_SELECT,
        data: [],
      };

      const result = makeSqlCondition(filterValue);

      expect(result).toEqual(Prisma.sql`= ANY(${[]})`);
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  textFilter,
  isTextFilterValue,
  multiSelectFilter,
  isMultiSelectFilterValue,
  singleSelectFilter,
  isSingleSelectFilterValue,
  numberFilter,
  dateRangeFilter,
  isNumberFilterValue,
  isDateRangeFilterValue,
  dataTableFilter,
  convertFacetedValuesToMap,
  convertMapToFacetedValues,
} from "./utils";

import type {
  TextFilterValue,
  MultiSelectFilterValue,
  SingleSelectFilterValue,
  NumberFilterValue,
  DateRangeFilterValue,
} from "./types";

describe("data-table utils", () => {
  describe("textFilter", () => {
    const makeTextFilter = (operator: string, operand = ""): TextFilterValue => ({
      type: "t",
      data: { operator: operator as TextFilterValue["data"]["operator"], operand },
    });

    it("equals - matches case-insensitively", () => {
      expect(textFilter("Hello", makeTextFilter("equals", "hello"))).toBe(true);
      expect(textFilter("Hello", makeTextFilter("equals", "world"))).toBe(false);
    });

    it("notEquals - matches case-insensitively", () => {
      expect(textFilter("Hello", makeTextFilter("notEquals", "world"))).toBe(true);
      expect(textFilter("Hello", makeTextFilter("notEquals", "hello"))).toBe(false);
    });

    it("contains - matches substring case-insensitively", () => {
      expect(textFilter("Hello World", makeTextFilter("contains", "world"))).toBe(true);
      expect(textFilter("Hello World", makeTextFilter("contains", "foo"))).toBe(false);
    });

    it("notContains - matches absence of substring", () => {
      expect(textFilter("Hello World", makeTextFilter("notContains", "foo"))).toBe(true);
      expect(textFilter("Hello World", makeTextFilter("notContains", "world"))).toBe(false);
    });

    it("startsWith - matches prefix case-insensitively", () => {
      expect(textFilter("Hello World", makeTextFilter("startsWith", "hello"))).toBe(true);
      expect(textFilter("Hello World", makeTextFilter("startsWith", "world"))).toBe(false);
    });

    it("endsWith - matches suffix case-insensitively", () => {
      expect(textFilter("Hello World", makeTextFilter("endsWith", "world"))).toBe(true);
      expect(textFilter("Hello World", makeTextFilter("endsWith", "hello"))).toBe(false);
    });

    it("isEmpty - matches empty/whitespace strings", () => {
      expect(textFilter("", makeTextFilter("isEmpty"))).toBe(true);
      expect(textFilter("  ", makeTextFilter("isEmpty"))).toBe(true);
      expect(textFilter("hello", makeTextFilter("isEmpty"))).toBe(false);
    });

    it("isEmpty - matches null/undefined cell values", () => {
      expect(textFilter(null, makeTextFilter("isEmpty"))).toBe(true);
      expect(textFilter(undefined, makeTextFilter("isEmpty"))).toBe(true);
    });

    it("isNotEmpty - matches non-empty strings", () => {
      expect(textFilter("hello", makeTextFilter("isNotEmpty"))).toBe(true);
      expect(textFilter("", makeTextFilter("isNotEmpty"))).toBe(false);
      expect(textFilter("  ", makeTextFilter("isNotEmpty"))).toBe(false);
    });

    it("returns false for non-string cell values (except isEmpty)", () => {
      expect(textFilter(123, makeTextFilter("equals", "123"))).toBe(false);
      expect(textFilter(null, makeTextFilter("contains", "x"))).toBe(false);
    });

    it("returns false for unknown operator", () => {
      expect(textFilter("hello", makeTextFilter("unknown", "hello"))).toBe(false);
    });
  });

  describe("isTextFilterValue", () => {
    it("returns true for valid text filter", () => {
      expect(isTextFilterValue({ type: "t", data: { operator: "equals", operand: "test" } })).toBe(true);
    });

    it("returns false for non-text filter", () => {
      expect(isTextFilterValue({ type: "ss", data: "test" })).toBe(false);
    });
  });

  describe("multiSelectFilter", () => {
    const makeMultiFilter = (data: Array<string | number>): MultiSelectFilterValue => ({
      type: "ms",
      data,
    });

    it("returns true when cell value matches one of the filter values (strings)", () => {
      expect(multiSelectFilter("active", makeMultiFilter(["active", "pending"]))).toBe(true);
    });

    it("returns false when cell value does not match any filter value", () => {
      expect(multiSelectFilter("cancelled", makeMultiFilter(["active", "pending"]))).toBe(false);
    });

    it("returns true when empty filter data (no filter applied)", () => {
      expect(multiSelectFilter("anything", makeMultiFilter([]))).toBe(true);
    });

    it("handles number arrays", () => {
      expect(multiSelectFilter(1, makeMultiFilter([1, 2, 3]))).toBe(true);
      expect(multiSelectFilter(5, makeMultiFilter([1, 2, 3]))).toBe(false);
    });

    it("handles array cell values", () => {
      expect(multiSelectFilter(["active", "pending"], makeMultiFilter(["active"]))).toBe(true);
      expect(multiSelectFilter(["cancelled"], makeMultiFilter(["active"]))).toBe(false);
    });

    it("returns false for mixed types (string filter with number cell)", () => {
      expect(multiSelectFilter(1, makeMultiFilter(["1", "2"]))).toBe(false);
    });
  });

  describe("isMultiSelectFilterValue", () => {
    it("returns true for valid multi-select filter", () => {
      expect(isMultiSelectFilterValue({ type: "ms", data: ["a", "b"] })).toBe(true);
    });

    it("returns false for invalid filter", () => {
      expect(isMultiSelectFilterValue({ type: "t", data: { operator: "equals", operand: "" } })).toBe(false);
    });
  });

  describe("singleSelectFilter", () => {
    const makeSingleFilter = (data: string | number): SingleSelectFilterValue => ({
      type: "ss",
      data,
    });

    it("matches when cell value equals filter value", () => {
      expect(singleSelectFilter("active", makeSingleFilter("active"))).toBe(true);
    });

    it("does not match when cell value differs", () => {
      expect(singleSelectFilter("pending", makeSingleFilter("active"))).toBe(false);
    });

    it("matches numeric values", () => {
      expect(singleSelectFilter(42, makeSingleFilter(42))).toBe(true);
      expect(singleSelectFilter(42, makeSingleFilter(43))).toBe(false);
    });
  });

  describe("isSingleSelectFilterValue", () => {
    it("returns true for valid single-select filter", () => {
      expect(isSingleSelectFilterValue({ type: "ss", data: "test" })).toBe(true);
    });

    it("returns false for invalid filter", () => {
      expect(isSingleSelectFilterValue({ type: "ms", data: ["a"] })).toBe(false);
    });
  });

  describe("numberFilter", () => {
    const makeNumberFilter = (operator: string, operand: number): NumberFilterValue => ({
      type: "n",
      data: { operator: operator as NumberFilterValue["data"]["operator"], operand },
    });

    it("eq - matches equal values", () => {
      expect(numberFilter(10, makeNumberFilter("eq", 10))).toBe(true);
      expect(numberFilter(10, makeNumberFilter("eq", 11))).toBe(false);
    });

    it("neq - matches non-equal values", () => {
      expect(numberFilter(10, makeNumberFilter("neq", 11))).toBe(true);
      expect(numberFilter(10, makeNumberFilter("neq", 10))).toBe(false);
    });

    it("gt - matches greater values", () => {
      expect(numberFilter(10, makeNumberFilter("gt", 5))).toBe(true);
      expect(numberFilter(10, makeNumberFilter("gt", 10))).toBe(false);
    });

    it("gte - matches greater or equal values", () => {
      expect(numberFilter(10, makeNumberFilter("gte", 10))).toBe(true);
      expect(numberFilter(10, makeNumberFilter("gte", 11))).toBe(false);
    });

    it("lt - matches lesser values", () => {
      expect(numberFilter(5, makeNumberFilter("lt", 10))).toBe(true);
      expect(numberFilter(10, makeNumberFilter("lt", 10))).toBe(false);
    });

    it("lte - matches lesser or equal values", () => {
      expect(numberFilter(10, makeNumberFilter("lte", 10))).toBe(true);
      expect(numberFilter(11, makeNumberFilter("lte", 10))).toBe(false);
    });

    it("returns false for non-number cell values", () => {
      expect(numberFilter("10", makeNumberFilter("eq", 10))).toBe(false);
      expect(numberFilter(null, makeNumberFilter("eq", 10))).toBe(false);
    });
  });

  describe("isNumberFilterValue", () => {
    it("returns true for valid number filter", () => {
      expect(isNumberFilterValue({ type: "n", data: { operator: "eq", operand: 10 } })).toBe(true);
    });

    it("returns false for invalid filter", () => {
      expect(isNumberFilterValue({ type: "ss", data: "test" })).toBe(false);
    });
  });

  describe("dateRangeFilter", () => {
    const makeDateRangeFilter = (startDate: string | null, endDate: string | null): DateRangeFilterValue => ({
      type: "dr",
      data: { startDate, endDate, preset: "custom" },
    });

    it("returns true when date is within range", () => {
      const cellDate = new Date("2025-06-15T12:00:00Z");
      expect(dateRangeFilter(cellDate, makeDateRangeFilter("2025-06-01T00:00:00Z", "2025-06-30T23:59:59Z"))).toBe(
        true
      );
    });

    it("returns false when date is outside range", () => {
      const cellDate = new Date("2025-07-15T12:00:00Z");
      expect(dateRangeFilter(cellDate, makeDateRangeFilter("2025-06-01T00:00:00Z", "2025-06-30T23:59:59Z"))).toBe(
        false
      );
    });

    it("returns true when startDate or endDate is null (no range constraint)", () => {
      const cellDate = new Date("2025-06-15T12:00:00Z");
      expect(dateRangeFilter(cellDate, makeDateRangeFilter(null, null))).toBe(true);
    });

    it("returns false for non-Date cell values", () => {
      expect(dateRangeFilter("2025-06-15", makeDateRangeFilter("2025-06-01", "2025-06-30"))).toBe(false);
      expect(dateRangeFilter(null, makeDateRangeFilter("2025-06-01", "2025-06-30"))).toBe(false);
    });
  });

  describe("isDateRangeFilterValue", () => {
    it("returns true for valid date range filter", () => {
      expect(
        isDateRangeFilterValue({ type: "dr", data: { startDate: "2025-01-01", endDate: "2025-12-31", preset: "year" } })
      ).toBe(true);
    });

    it("returns false for invalid filter", () => {
      expect(isDateRangeFilterValue({ type: "ss", data: "test" })).toBe(false);
    });
  });

  describe("dataTableFilter", () => {
    it("delegates to singleSelectFilter for single-select values", () => {
      expect(dataTableFilter("active", { type: "ss", data: "active" })).toBe(true);
      expect(dataTableFilter("pending", { type: "ss", data: "active" })).toBe(false);
    });

    it("delegates to multiSelectFilter for multi-select values", () => {
      expect(dataTableFilter("active", { type: "ms", data: ["active", "pending"] })).toBe(true);
    });

    it("delegates to textFilter for text values", () => {
      expect(dataTableFilter("Hello", { type: "t", data: { operator: "contains", operand: "ell" } })).toBe(true);
    });

    it("delegates to numberFilter for number values", () => {
      expect(dataTableFilter(10, { type: "n", data: { operator: "gt", operand: 5 } })).toBe(true);
    });

    it("delegates to dateRangeFilter for date range values", () => {
      const cellDate = new Date("2025-06-15T12:00:00Z");
      expect(
        dataTableFilter(cellDate, {
          type: "dr",
          data: { startDate: "2025-06-01T00:00:00Z", endDate: "2025-06-30T23:59:59Z", preset: "custom" },
        })
      ).toBe(true);
    });

    it("returns false for unrecognized filter types", () => {
      expect(dataTableFilter("test", { type: "unknown" as "ss", data: "test" })).toBe(false);
    });
  });

  describe("convertFacetedValuesToMap", () => {
    it("converts an array of faceted values to a Map", () => {
      const values = [
        { label: "Active", value: "active" },
        { label: "Pending", value: "pending" },
      ];
      const result = convertFacetedValuesToMap(values);
      expect(result.size).toBe(2);
    });

    it("handles empty array", () => {
      const result = convertFacetedValuesToMap([]);
      expect(result.size).toBe(0);
    });

    it("preserves section in map keys", () => {
      const values = [{ label: "Active", value: "active", section: "Status" }];
      const result = convertFacetedValuesToMap(values);
      const keys = Array.from(result.keys());
      expect(keys[0]).toEqual({ label: "Active", value: "active", section: "Status" });
    });
  });

  describe("convertMapToFacetedValues", () => {
    it("converts a Map back to faceted values array", () => {
      const map = new Map<{ label: string; value: string | number; section?: string }, number>();
      map.set({ label: "Active", value: "active", section: undefined }, 1);
      map.set({ label: "Pending", value: "pending", section: "Status" }, 1);

      const result = convertMapToFacetedValues(map);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ label: "Active", value: "active", section: undefined });
      expect(result[1]).toEqual({ label: "Pending", value: "pending", section: "Status" });
    });

    it("returns empty array for undefined input", () => {
      expect(convertMapToFacetedValues(undefined)).toEqual([]);
    });

    it("returns empty array for non-Map input", () => {
      // @ts-expect-error -- deliberately passing wrong type to test runtime guard
      expect(convertMapToFacetedValues("not a map")).toEqual([]);
    });

    it("handles string keys in the map", () => {
      const map = new Map<string, number>();
      map.set("Active", 1);
      // @ts-expect-error -- deliberately passing wrong type to test runtime guard
      const result = convertMapToFacetedValues(map);
      expect(result[0]).toEqual({ label: "Active", value: "Active", section: undefined });
    });
  });
});

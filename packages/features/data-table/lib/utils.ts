"use client";

import { parseAsArrayOf, parseAsJson, useQueryStates } from "nuqs";
import { useMemo } from "react";
import { z } from "zod";

import type { SelectFilterValue, TextFilterValue, FilterValue } from "./types";
import { ZFilterValue } from "./types";

export const dataTableFiltersSchema = z.object({
  f: z.string(),
  v: ZFilterValue,
});

export function useFiltersState() {
  return useQueryStates({
    activeFilters: parseAsArrayOf(parseAsJson(dataTableFiltersSchema.parse)).withDefault([]),
  });
}

export type FiltersSearchState = ReturnType<typeof useFiltersState>[0];
export type SetFiltersSearchState = ReturnType<typeof useFiltersState>[1];
export type ActiveFilter = z.infer<typeof dataTableFiltersSchema>;

export function useColumnFilters() {
  const [state] = useFiltersState();
  return useMemo(
    () =>
      (state.activeFilters || [])
        .filter((filter) => typeof filter === "object" && filter && "f" in filter && "v" in filter)
        .map((filter) => ({
          id: filter.f,
          value: filter.v,
        }))
        .filter((filter) => {
          // The empty arrays in `filtersSearchState` keep the filter UI component,
          // but we do not send them to the actual query.
          // Otherwise, `{ my_column_name: { in: []} }` would result in nothing being returned.
          if (Array.isArray(filter.value) && filter.value.length === 0) {
            return false;
          }
          return true;
        }),
    [state]
  );
}

export const textFilter = (cellValue: unknown, filterValue: TextFilterValue) => {
  if (typeof cellValue !== "string") {
    return false;
  }

  switch (filterValue.data.operator) {
    case "equals":
      return cellValue.toLowerCase() === (filterValue.data.operand || "").toLowerCase();
    case "notEquals":
      return cellValue.toLowerCase() !== (filterValue.data.operand || "").toLowerCase();
    case "contains":
      return cellValue.toLowerCase().includes((filterValue.data.operand || "").toLowerCase());
    case "notContains":
      return !cellValue.toLowerCase().includes((filterValue.data.operand || "").toLowerCase());
    case "startsWith":
      return cellValue.toLowerCase().startsWith((filterValue.data.operand || "").toLowerCase());
    case "endsWith":
      return cellValue.toLowerCase().endsWith((filterValue.data.operand || "").toLowerCase());
    case "isEmpty":
      return cellValue.trim() === "";
    case "isNotEmpty":
      return cellValue.trim() !== "";
    default:
      return false;
  }
};

export const isTextFilterValue = (filterValue: unknown): filterValue is TextFilterValue => {
  return (
    typeof filterValue === "object" &&
    filterValue !== null &&
    "type" in filterValue &&
    filterValue.type === "text"
  );
};

export const selectFilter = (cellValue: unknown | undefined, filterValue: SelectFilterValue) => {
  const cellValueArray = Array.isArray(cellValue) ? cellValue : [cellValue];
  if (!cellValueArray.every((value) => typeof value === "string")) {
    return false;
  }

  return filterValue.length === 0 ? true : cellValueArray.some((v) => filterValue.includes(v));
};

export const isSelectFilterValue = (filterValue: unknown): filterValue is SelectFilterValue => {
  return Array.isArray(filterValue) && filterValue.every((item) => typeof item === "string");
};

export const dataTableFilter = (cellValue: unknown, filterValue: FilterValue) => {
  if (isSelectFilterValue(filterValue)) {
    return selectFilter(cellValue, filterValue);
  } else if (isTextFilterValue(filterValue)) {
    return textFilter(cellValue, filterValue);
  }
  return false;
};

export const convertToTitleCase = (str: string) => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

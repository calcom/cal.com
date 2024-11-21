"use client";

import type { Row } from "@tanstack/react-table";
import { parseAsArrayOf, parseAsJson, useQueryStates } from "nuqs";
import { useMemo, useCallback } from "react";
import { z, type Schema } from "zod";

import type { SelectFilterValue, TextFilterValue, ColumnFilter } from "./types";
import { ZSelectFilterValue, ZTextFilterValue } from "./types";

const filterSchema = z.object({
  f: z.string(),
  v: z.union([ZSelectFilterValue, ZTextFilterValue]),
});

export function useFiltersFromSearchState() {
  return useQueryStates({
    activeFilters: parseAsArrayOf(parseAsJson(filterSchema.parse)).withDefault([]),
  });
}

export function useFilterFromSearchState(id: string, schema?: Schema) {
  const [state, setState] = useFiltersFromSearchState();

  const value = useMemo(() => {
    const filter = (state.activeFilters || []).find((filter) => filter.f === id);
    if (!schema || !filter?.v) {
      return filter?.v;
    } else {
      const result = schema.safeParse(filter.v);
      return result.success ? result.data : undefined;
    }
  }, [id, state, schema]);

  const setValue = useCallback(
    (value: z.infer<Schema>) => {
      let activeFilters = state.activeFilters || [];
      const filter = activeFilters.find((filter) => filter.f === id);
      if (filter) {
        filter.v = value;
      } else {
        activeFilters = [
          ...activeFilters,
          {
            f: id,
            v: value,
          },
        ];
      }
      setState({ activeFilters });
    },
    [id, state, setState]
  );

  return [value, setValue];
}

export function useColumnFilters(): ColumnFilter[] {
  const [filters] = useFiltersFromSearchState();
  const columnFilters = useMemo(() => {
    return (filters.activeFilters || [])
      .map((filter) => ({
        id: filter.f,
        value: filter.v,
      }))
      .filter((filter) => {
        // The empty arrays in `filtersSearchState` keep the filter UI component,
        // but we do not send them to the actual query.
        // Otherwise, { value: [] } would result in nothing being returned.
        if (Array.isArray(filter.value) && filter.value.length === 0) {
          return false;
        }
        return true;
      });
  }, [filters.activeFilters]);
  return columnFilters;
}

export type FiltersSearchState = ReturnType<typeof useFiltersFromSearchState>[0];
export type SetFiltersSearchState = ReturnType<typeof useFiltersFromSearchState>[1];
export type ActiveFilter = NonNullable<FiltersSearchState["activeFilters"]>[number];

export const textFilter = (cellValue: string, filterValue: TextFilterValue) => {
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

export const selectFilter = (cellValue: string | string[], filterValue: SelectFilterValue) => {
  const cellValueArray = Array.isArray(cellValue) ? cellValue : [cellValue];

  return filterValue.length === 0 ? true : cellValueArray.some((v) => filterValue.includes(v));
};

export const isSelectFilterValue = (filterValue: unknown): filterValue is SelectFilterValue => {
  return Array.isArray(filterValue) && filterValue.every((item) => typeof item === "string");
};

export const dataTableFilterFn = (row: Row<any>, id: string, filterValue: unknown) => {
  console.log("💡 dataTableFilterFn", { row, id, filterValue });
  if (isSelectFilterValue(filterValue)) {
    return selectFilter(row.original[id], filterValue);
  } else if (isTextFilterValue(filterValue)) {
    return textFilter(row.original[id], filterValue);
  } else {
    return false;
  }
};

export const convertToTitleCase = (str: string) => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

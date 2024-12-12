"use client";

import { useMemo, useContext } from "react";
import type { z } from "zod";

import { DataTableContext } from "./context";
import type {
  SelectFilterValue,
  TextFilterValue,
  FilterValue,
  NumberFilterValue,
  ColumnFilter,
} from "./types";
import { ZFilterValue, ZNumberFilterValue, ZSelectFilterValue, ZTextFilterValue } from "./types";

export function useDataTable() {
  const context = useContext(DataTableContext);
  if (!context) {
    throw new Error("useDataTable must be used within a DataTableProvider");
  }
  return context;
}

export function useFilterValue<T>(columnId: string, schema: z.ZodType<T>) {
  const { activeFilters } = useDataTable();
  return useMemo(() => {
    const value = activeFilters.find((filter) => filter.f === columnId)?.v;
    if (schema && value) {
      const result = schema.safeParse(value);
      if (result.success) {
        return result.data;
      }
    }
    return undefined;
  }, [activeFilters, columnId, schema]);
}

export function useColumnFilters(): ColumnFilter[] {
  const { activeFilters } = useDataTable();
  return useMemo(() => {
    return (activeFilters || [])
      .filter(
        (filter) =>
          typeof filter === "object" && filter && "f" in filter && "v" in filter && filter.v !== undefined
      )
      .map((filter) => {
        const parsedValue = ZFilterValue.safeParse(filter.v);
        if (!parsedValue.success) return null;
        return {
          id: filter.f,
          value: parsedValue.data,
        };
      })
      .filter((filter): filter is ColumnFilter => filter !== null)
      .filter((filter) => {
        // The empty arrays in `filtersSearchState` keep the filter UI component,
        // but we do not send them to the actual query.
        // Otherwise, `{ my_column_name: { in: []} }` would result in nothing being returned.
        if (isSelectFilterValue(filter.value) && filter.value.length === 0) {
          return false;
        }
        return true;
      });
  }, [activeFilters]);
}

export const textFilter = (cellValue: unknown, filterValue: TextFilterValue) => {
  if (filterValue.data.operator === "isEmpty" && cellValue === undefined) {
    return true;
  }

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
  return ZTextFilterValue.safeParse(filterValue).success;
};

export const selectFilter = (cellValue: unknown | undefined, filterValue: SelectFilterValue) => {
  const cellValueArray = Array.isArray(cellValue) ? cellValue : [cellValue];
  if (!cellValueArray.every((value) => typeof value === "string")) {
    return false;
  }

  return filterValue.length === 0 ? true : cellValueArray.some((v) => filterValue.includes(v));
};

export const isSelectFilterValue = (filterValue: unknown): filterValue is SelectFilterValue => {
  return ZSelectFilterValue.safeParse(filterValue).success;
};

export const numberFilter = (cellValue: unknown, filterValue: NumberFilterValue) => {
  if (typeof cellValue !== "number") {
    return false;
  }

  switch (filterValue.data.operator) {
    case "eq":
      return cellValue === filterValue.data.operand;
    case "neq":
      return cellValue !== filterValue.data.operand;
    case "gt":
      return cellValue > filterValue.data.operand;
    case "gte":
      return cellValue >= filterValue.data.operand;
    case "lt":
      return cellValue < filterValue.data.operand;
    case "lte":
      return cellValue <= filterValue.data.operand;
  }

  return false;
};

export const isNumberFilterValue = (filterValue: unknown): filterValue is NumberFilterValue => {
  return ZNumberFilterValue.safeParse(filterValue).success;
};

export const dataTableFilter = (cellValue: unknown, filterValue: FilterValue) => {
  if (isSelectFilterValue(filterValue)) {
    return selectFilter(cellValue, filterValue);
  } else if (isTextFilterValue(filterValue)) {
    return textFilter(cellValue, filterValue);
  } else if (isNumberFilterValue(filterValue)) {
    return numberFilter(cellValue, filterValue);
  }
  return false;
};

export const convertToTitleCase = (str: string) => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

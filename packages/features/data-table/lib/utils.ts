"use client";

import { parseAsString, parseAsArrayOf, parseAsJson, useQueryState } from "nuqs";
import { useMemo, useCallback } from "react";
import { z } from "zod";

import type {
  SelectFilterValue,
  TextFilterValue,
  FilterValue,
  NumberFilterValue,
  ColumnFilter,
} from "./types";
import { ZFilterValue, ZNumberFilterValue, ZSelectFilterValue, ZTextFilterValue } from "./types";

const dataTableFiltersSchema = z.object({
  f: z.string(),
  v: ZFilterValue.optional(),
});

export function useFiltersState() {
  const [state, setState] = useQueryState(
    "activeFilters",
    parseAsArrayOf(parseAsJson(dataTableFiltersSchema.parse)).withDefault([])
  );
  const clear = useCallback(() => {
    setState([]);
  }, [setState]);

  const updateFilter = useCallback(
    (columnId: string, value: FilterValue) => {
      setState((prev) => {
        return prev.map((item) => (item.f === columnId ? { ...item, v: value } : item));
      });
    },
    [setState]
  );

  const removeFilter = useCallback(
    (columnId: string) => {
      setState((prev) => prev.filter((filter) => filter.f !== columnId));
    },
    [setState]
  );

  return {
    state,
    setState,
    clear,
    updateFilter,
    removeFilter,
  };
}

export function useFilterValue<T>(columnId: string, schema: z.ZodType<T>) {
  const { state } = useFiltersState();
  return useMemo(() => {
    const value = state.find((filter) => filter.f === columnId)?.v;
    if (schema && value) {
      try {
        return schema.parse(value);
      } catch {}
    }
    return undefined;
  }, [state, columnId, schema]);
}

export function useExternalFiltersState() {
  const [externalFiltersState, setExternalFiltersState] = useQueryState(
    "ef",
    parseAsArrayOf(parseAsString).withDefault([])
  );
  const removeExternalFilter = useCallback(
    (key: string) => {
      setExternalFiltersState((prev) => prev.filter((f) => f !== key));
    },
    [setExternalFiltersState]
  );
  return { externalFiltersState, setExternalFiltersState, removeExternalFilter };
}

export type FiltersSearchState = ReturnType<typeof useFiltersState>["state"];
export type SetFiltersSearchState = ReturnType<typeof useFiltersState>["setState"];

export function useColumnFilters(): ColumnFilter[] {
  const { state } = useFiltersState();
  return useMemo(() => {
    return (state || [])
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
  }, [state]);
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

"use client";

import { useMemo, useContext } from "react";
import type { z } from "zod";

import { DataTableContext } from "./context";
import type { ColumnFilter } from "./types";
import { ZFilterValue } from "./types";
import { isMultiSelectFilterValue } from "./utils";

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
        if (isMultiSelectFilterValue(filter.value) && filter.value.data.length === 0) {
          return false;
        }
        return true;
      });
  }, [activeFilters]);
}

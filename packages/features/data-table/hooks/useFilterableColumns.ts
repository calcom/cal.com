"use client";

import { type Table } from "@tanstack/react-table";
// eslint-disable-next-line no-restricted-imports
import { useMemo } from "react";

import type { FilterableColumn, FacetedValue } from "../lib/types";
import { ColumnFilterType } from "../lib/types";
import { convertMapToFacetedValues } from "../lib/utils";

export function useFilterableColumns<TData>(table: Table<TData>) {
  const columns = useMemo(
    () => table.getAllColumns().filter((column) => column.getCanFilter()),

    [table.getAllColumns()]
  );

  const filterableColumns = useMemo<FilterableColumn[]>(
    () =>
      columns
        .map((column) => {
          const type = column.columnDef.meta?.filter?.type || ColumnFilterType.MULTI_SELECT;
          const base = {
            id: column.id,
            title: typeof column.columnDef.header === "string" ? column.columnDef.header : column.id,
            ...(column.columnDef.meta?.filter || {}),
            type,
          };
          if (type === ColumnFilterType.MULTI_SELECT || type === ColumnFilterType.SINGLE_SELECT) {
            // `column.getFacetedUniqueValues` gets out of sync
            // when we pass a new `getFacetedUniqueValues` to
            // `useReactTable({ ... })`.
            //
            // So we use `table.options.getFacetedUniqueValues` instead.
            let values: Map<FacetedValue, number> | (() => Map<FacetedValue, number>) | undefined =
              table.options?.getFacetedUniqueValues?.(table, column.id);
            if (typeof values === "function") {
              values = values();
            }

            const options = convertMapToFacetedValues(values);
            return {
              ...base,
              options,
            };
          } else {
            return {
              ...base,
            };
          }
        })
        .filter((column): column is FilterableColumn => Boolean(column)),

    // re-calculate this when the `getFacetedUniqueValues` changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, table.options.getFacetedUniqueValues]
  );

  return filterableColumns;
}

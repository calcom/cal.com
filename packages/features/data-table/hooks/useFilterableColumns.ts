"use client";

import { type Table } from "@tanstack/react-table";
// eslint-disable-next-line no-restricted-imports
import { useMemo } from "react";

import type { FilterableColumn } from "../../lib/types";

export function useFilterableColumns<TData>(table: Table<TData>) {
  const columns = useMemo(
    () => table.getAllColumns().filter((column) => column.getCanFilter()),
    [table.getAllColumns()]
  );

  const filterableColumns = useMemo<FilterableColumn[]>(
    () =>
      columns
        .map((column) => {
          const type = column.columnDef.meta?.filter?.type || "multi_select";
          const base = {
            id: column.id,
            title: typeof column.columnDef.header === "string" ? column.columnDef.header : column.id,
            ...(column.columnDef.meta?.filter || {}),
            type,
          };
          if (type === "multi_select" || type === "single_select") {
            const values = column.getFacetedUniqueValues();
            const options = Array.from(values.keys()).map((option) => {
              if (typeof option === "string") {
                return {
                  label: option,
                  value: option,
                };
              } else {
                return {
                  label: option.label as string,
                  value: option.value as string | number,
                };
              }
            });
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
    [columns]
  );

  return filterableColumns;
}

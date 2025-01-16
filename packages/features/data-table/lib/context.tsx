"use client";

import type { SortingState, OnChangeFn } from "@tanstack/react-table";
import { useQueryState, parseAsArrayOf, parseAsJson } from "nuqs";
import { createContext, useCallback } from "react";
import { z } from "zod";

import { type FilterValue, ZFilterValue, ZSorting } from "./types";

const ZActiveFilter = z.object({
  f: z.string(),
  v: ZFilterValue.optional(),
});

type ActiveFilter = z.infer<typeof ZActiveFilter>;

export type DataTableContextType = {
  activeFilters: ActiveFilter[];
  setActiveFilters: (filters: ActiveFilter[]) => void;
  clearAll: (exclude?: string[]) => void;
  updateFilter: (columnId: string, value: FilterValue) => void;
  removeFilter: (columnId: string) => void;

  sorting: SortingState;
  setSorting: OnChangeFn<SortingState>;
};

export const DataTableContext = createContext<DataTableContextType | null>(null);

export function DataTableProvider({ children }: { children: React.ReactNode }) {
  const [activeFilters, setActiveFilters] = useQueryState(
    "activeFilters",
    parseAsArrayOf(parseAsJson(ZActiveFilter.parse)).withDefault([])
  );
  const [sorting, setSorting] = useQueryState(
    "sorting",
    parseAsArrayOf(parseAsJson(ZSorting.parse)).withDefault([])
  );

  const clearAll = useCallback(
    (exclude?: string[]) => {
      setActiveFilters((prev) => prev.filter((filter) => exclude?.includes(filter.f)));
    },
    [setActiveFilters]
  );

  const updateFilter = useCallback(
    (columnId: string, value: FilterValue) => {
      setActiveFilters((prev) => {
        let added = false;
        const newFilters = prev.map((item) => {
          if (item.f === columnId) {
            added = true;
            return { ...item, v: value };
          }
          return item;
        });
        if (!added) {
          newFilters.push({ f: columnId, v: value });
        }
        return newFilters;
      });
    },
    [setActiveFilters]
  );

  const removeFilter = useCallback(
    (columnId: string) => {
      setActiveFilters((prev) => prev.filter((filter) => filter.f !== columnId));
    },
    [setActiveFilters]
  );

  return (
    <DataTableContext.Provider
      value={{
        activeFilters,
        setActiveFilters,
        clearAll,
        updateFilter,
        removeFilter,
        sorting,
        setSorting,
      }}>
      {children}
    </DataTableContext.Provider>
  );
}

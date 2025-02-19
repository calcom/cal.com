"use client";

import type { SortingState, OnChangeFn } from "@tanstack/react-table";
import { useQueryState, parseAsArrayOf, parseAsJson } from "nuqs";
import { createContext, useCallback, useState, type Dispatch, type SetStateAction } from "react";
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
  clearAll: () => void;
  updateFilter: (columnId: string, value: FilterValue) => void;
  removeFilter: (columnId: string) => void;

  sorting: SortingState;
  setSorting: OnChangeFn<SortingState>;

  displayedExternalFilters: string[];
  setDisplayedExternalFilters: Dispatch<SetStateAction<string[]>>;
  removeDisplayedExternalFilter: (key: string) => void;
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

  const [displayedExternalFilters, setDisplayedExternalFilters] = useState<string[]>([]);

  const removeDisplayedExternalFilter = useCallback(
    (key: string) => {
      setDisplayedExternalFilters((prev) => prev.filter((f) => f !== key));
    },
    [setDisplayedExternalFilters]
  );

  const clearAll = useCallback(() => {
    setActiveFilters([]);
  }, [setActiveFilters]);

  const updateFilter = useCallback(
    (columnId: string, value: FilterValue) => {
      setActiveFilters((prev) => {
        return prev.map((item) => (item.f === columnId ? { ...item, v: value } : item));
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
        displayedExternalFilters,
        setDisplayedExternalFilters,
        removeDisplayedExternalFilter,
      }}>
      {children}
    </DataTableContext.Provider>
  );
}

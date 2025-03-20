"use client";

import type { SortingState, OnChangeFn, VisibilityState } from "@tanstack/react-table";
import { useQueryState, parseAsArrayOf, parseAsJson, parseAsInteger } from "nuqs";
import { createContext, useCallback } from "react";
import { z } from "zod";

import { type FilterValue, ZFilterValue, ZSorting, ZColumnVisibility } from "./types";

const ZActiveFilter = z.object({
  f: z.string(),
  v: ZFilterValue.optional(),
});

type ActiveFilter = z.infer<typeof ZActiveFilter>;

export type DataTableContextType = {
  activeFilters: ActiveFilter[];
  clearAll: (exclude?: string[]) => void;
  addFilter: (columnId: string) => void;
  updateFilter: (columnId: string, value: FilterValue) => void;
  removeFilter: (columnId: string) => void;

  sorting: SortingState;
  setSorting: OnChangeFn<SortingState>;

  columnVisibility: VisibilityState;
  setColumnVisibility: OnChangeFn<VisibilityState>;

  pageIndex: number;
  pageSize: number;
  setPageIndex: (pageIndex: number) => void;
  setPageSize: (pageSize: number) => void;

  offset: number;
  limit: number;
};

export const DataTableContext = createContext<DataTableContextType | null>(null);

const DEFAULT_ACTIVE_FILTERS: ActiveFilter[] = [];
const DEFAULT_SORTING: SortingState = [];
const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {};
const DEFAULT_PAGE_SIZE = 10;

interface DataTableProviderProps {
  children: React.ReactNode;
  defaultPageSize?: number;
}

export function DataTableProvider({ children, defaultPageSize = DEFAULT_PAGE_SIZE }: DataTableProviderProps) {
  const [activeFilters, setActiveFilters] = useQueryState(
    "activeFilters",
    parseAsArrayOf(parseAsJson(ZActiveFilter.parse)).withDefault(DEFAULT_ACTIVE_FILTERS)
  );
  const [sorting, setSorting] = useQueryState(
    "sorting",
    parseAsArrayOf(parseAsJson(ZSorting.parse)).withDefault(DEFAULT_SORTING)
  );
  const [columnVisibility, setColumnVisibility] = useQueryState<VisibilityState>(
    "cols",
    parseAsJson(ZColumnVisibility.parse).withDefault(DEFAULT_COLUMN_VISIBILITY)
  );

  const [pageIndex, setPageIndex] = useQueryState("page", parseAsInteger.withDefault(0));
  const [pageSize, setPageSize] = useQueryState("size", parseAsInteger.withDefault(defaultPageSize));

  const addFilter = useCallback(
    (columnId: string) => {
      if (!activeFilters?.some((filter) => filter.f === columnId)) {
        setActiveFilters([...activeFilters, { f: columnId, v: undefined }]);
      }
    },
    [activeFilters, setActiveFilters]
  );

  const clearAll = useCallback(
    (exclude?: string[]) => {
      setPageIndex(0);
      setActiveFilters((prev) => prev.filter((filter) => exclude?.includes(filter.f)));
    },
    [setActiveFilters]
  );

  const updateFilter = useCallback(
    (columnId: string, value: FilterValue) => {
      setPageIndex(0);
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
      setPageIndex(0);
      setActiveFilters((prev) => prev.filter((filter) => filter.f !== columnId));
    },
    [setActiveFilters]
  );

  const setPageSizeAndGoToFirstPage = useCallback(
    (newPageSize: number) => {
      setPageSize(newPageSize);
      setPageIndex(0);
    },
    [setPageSize, setPageIndex]
  );

  return (
    <DataTableContext.Provider
      value={{
        activeFilters,
        addFilter,
        clearAll,
        updateFilter,
        removeFilter,
        sorting,
        setSorting,
        columnVisibility,
        setColumnVisibility,
        pageIndex,
        pageSize,
        setPageIndex,
        setPageSize: setPageSizeAndGoToFirstPage,
        limit: pageSize,
        offset: pageIndex * pageSize,
      }}>
      {children}
    </DataTableContext.Provider>
  );
}

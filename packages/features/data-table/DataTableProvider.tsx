"use client";

import type { SortingState, OnChangeFn, VisibilityState } from "@tanstack/react-table";
import { useQueryState, parseAsArrayOf, parseAsJson, parseAsInteger } from "nuqs";
import { createContext, useCallback, useRef, useEffect } from "react";
import { z } from "zod";

import { type FilterValue, ZFilterValue, ZSorting, ZColumnVisibility } from "./lib/types";

const ZActiveFilter = z.object({
  f: z.string(),
  v: ZFilterValue.optional(),
});

type ActiveFilter = z.infer<typeof ZActiveFilter>;

export type DataTableContextType = {
  ctaContainerRef?: React.RefObject<HTMLDivElement>;

  activeFilters: ActiveFilter[];
  clearAll: (exclude?: string[]) => void;
  addFilter: (columnId: string) => void;
  updateFilter: (columnId: string, value: FilterValue) => void;
  removeFilter: (columnId: string) => void;

  sorting: SortingState;
  setSorting: OnChangeFn<SortingState>;

  columnVisibility: VisibilityState;
  setColumnVisibility: OnChangeFn<VisibilityState>;

  pageIndex: number | null;
  pageSize: number | null;
  setPageIndex: (pageIndex: number | null) => void;
  setPageSize: (pageSize: number | null) => void;

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
  ctaContainerClassName?: string;
  defaultPageSize?: number;
}

export function DataTableProvider({
  children,
  defaultPageSize = DEFAULT_PAGE_SIZE,
  ctaContainerClassName,
}: DataTableProviderProps) {
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
      setPageIndex(null);
      setActiveFilters((prev) => {
        const remainingFilters = prev.filter((filter) => exclude?.includes(filter.f));
        return remainingFilters.length == 0 ? null : remainingFilters;
      });
    },
    [setActiveFilters]
  );

  const setPageIndexWrapper = (newPageIndex: number) => setPageIndex(newPageIndex || null);

  const updateFilter = useCallback(
    (columnId: string, value: FilterValue) => {
      setPageIndex(null);
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
      setPageIndex(null);
      setActiveFilters((prev) => {
        const remainingFilters = prev.filter((filter) => filter.f !== columnId);
        return remainingFilters.length == 0 ? null : remainingFilters;
      });
    },
    [setActiveFilters]
  );

  const setPageSizeAndGoToFirstPage = useCallback(
    (newPageSize: number) => {
      setPageSize(newPageSize == DEFAULT_PAGE_SIZE ? null : newPageSize);
      setPageIndex(null);
    },
    [setPageSize, setPageIndex]
  );

  const ctaContainerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (ctaContainerClassName) {
      const element = document.getElementsByClassName(ctaContainerClassName)[0] as HTMLDivElement;
      ctaContainerRef.current = element;
    }
  }, [ctaContainerClassName]);

  return (
    <DataTableContext.Provider
      value={{
        ctaContainerRef,
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
        setPageIndex: setPageIndexWrapper,
        setPageSize: setPageSizeAndGoToFirstPage,
        limit: pageSize,
        offset: pageIndex * pageSize,
      }}>
      {children}
    </DataTableContext.Provider>
  );
}

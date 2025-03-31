"use client";

import type { SortingState, OnChangeFn, VisibilityState, ColumnSizingState } from "@tanstack/react-table";
import { usePathname } from "next/navigation";
import { useQueryState, parseAsArrayOf, parseAsJson, parseAsInteger } from "nuqs";
import { createContext, useCallback, useEffect, useRef } from "react";

import { useSegments } from "./lib/segments";
import {
  type FilterValue,
  ZSorting,
  ZColumnVisibility,
  ZActiveFilter,
  ZColumnSizing,
  type FilterSegmentOutput,
  type ActiveFilters,
} from "./lib/types";

export type DataTableContextType = {
  tableIdentifier: string;
  ctaContainerRef?: React.RefObject<HTMLDivElement>;

  activeFilters: ActiveFilters;
  clearAll: (exclude?: string[]) => void;
  addFilter: (columnId: string) => void;
  updateFilter: (columnId: string, value: FilterValue) => void;
  removeFilter: (columnId: string) => void;

  sorting: SortingState;
  setSorting: OnChangeFn<SortingState>;

  columnVisibility: VisibilityState;
  setColumnVisibility: OnChangeFn<VisibilityState>;

  columnSizing: ColumnSizingState;
  setColumnSizing: OnChangeFn<ColumnSizingState>;

  pageIndex: number;
  pageSize: number;
  setPageIndex: (pageIndex: number) => void;
  setPageSize: (pageSize: number) => void;

  offset: number;
  limit: number;

  segments: FilterSegmentOutput[];
  selectedSegment: FilterSegmentOutput | undefined;
  segmentId: number | undefined;
  setSegmentId: (id: number | null) => void;
  canSaveSegment: boolean;
};

export const DataTableContext = createContext<DataTableContextType | null>(null);

const DEFAULT_ACTIVE_FILTERS: ActiveFilters = [];
const DEFAULT_SORTING: SortingState = [];
const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {};
const DEFAULT_COLUMN_SIZING: ColumnSizingState = {};
const DEFAULT_PAGE_SIZE = 10;

interface DataTableProviderProps {
  tableIdentifier?: string;
  children: React.ReactNode;
  ctaContainerClassName?: string;
  defaultPageSize?: number;
}

export function DataTableProvider({
  tableIdentifier: _tableIdentifier,
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
  const [columnSizing, setColumnSizing] = useQueryState<ColumnSizingState>(
    "widths",
    parseAsJson(ZColumnSizing.parse).withDefault(DEFAULT_COLUMN_SIZING)
  );
  const [segmentId, setSegmentId] = useQueryState("segment", parseAsInteger.withDefault(-1));
  const [pageIndex, setPageIndex] = useQueryState("page", parseAsInteger.withDefault(0));
  const [pageSize, setPageSize] = useQueryState("size", parseAsInteger.withDefault(defaultPageSize));

  const pathname = usePathname() as string | null;
  const tableIdentifier = _tableIdentifier ?? pathname ?? undefined;
  if (!tableIdentifier) {
    throw new Error("tableIdentifier is required");
  }

  const addFilter = useCallback(
    (columnId: string) => {
      if (!activeFilters?.some((filter) => filter.f === columnId)) {
        // do not reset the page to 0 here,
        // because we don't have the filter value yet (`v: undefined`)
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
    [setActiveFilters, setPageIndex]
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
    [setActiveFilters, setPageIndex]
  );

  const removeFilter = useCallback(
    (columnId: string) => {
      setPageIndex(0);
      setActiveFilters((prev) => prev.filter((filter) => filter.f !== columnId));
    },
    [setActiveFilters, setPageIndex]
  );

  const setPageSizeAndGoToFirstPage = useCallback(
    (newPageSize: number) => {
      setPageSize(newPageSize);
      setPageIndex(0);
    },
    [setPageSize, setPageIndex]
  );

  const { segments, selectedSegment, canSaveSegment, setSegmentIdAndSaveToLocalStorage } = useSegments({
    tableIdentifier,
    activeFilters,
    sorting,
    columnVisibility,
    columnSizing,
    pageSize,
    defaultPageSize,
    segmentId,
    setSegmentId,
    setActiveFilters,
    setSorting,
    setColumnVisibility,
    setColumnSizing,
    setPageSize,
    setPageIndex,
  });

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
        tableIdentifier,
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
        columnSizing,
        setColumnSizing,
        pageIndex,
        pageSize,
        setPageIndex,
        setPageSize: setPageSizeAndGoToFirstPage,
        limit: pageSize,
        offset: pageIndex * pageSize,
        segments,
        selectedSegment,
        segmentId: segmentId || undefined,
        setSegmentId: setSegmentIdAndSaveToLocalStorage,
        canSaveSegment,
      }}>
      {children}
    </DataTableContext.Provider>
  );
}

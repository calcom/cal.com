"use client";

import type { SortingState, OnChangeFn, VisibilityState, ColumnSizingState } from "@tanstack/react-table";
import { useQueryState } from "nuqs";
import { createContext, useContext, useRef, useMemo } from "react";

import { useElementByClassName } from "@calcom/lib/hooks/useElementByClassName";

import {
  activeFiltersParser,
  sortingParser,
  columnVisibilityParser,
  columnSizingParser,
  segmentIdParser,
  pageIndexParser,
  pageSizeParser,
  searchTermParser,
  DEFAULT_PAGE_SIZE,
} from "@calcom/features/data-table/lib/parsers";
import type { ActiveFilters, SegmentIdentifier } from "@calcom/features/data-table/lib/types";
import { CTA_CONTAINER_CLASS_NAME } from "@calcom/features/data-table/lib/utils";

export type ActiveFiltersValidator = (filters: ActiveFilters) => ActiveFilters;

export type ActiveFiltersValidatorState = ActiveFiltersValidator | "loading" | undefined;

export type DataTableStateContextType = {
  tableIdentifier: string;
  ctaContainerRef: React.RefObject<HTMLDivElement>;
  filterToOpen: React.MutableRefObject<string | undefined>;

  pageIndex: number;
  setPageIndex: (pageIndex: number | null) => void;

  pageSize: number;
  setPageSize: (pageSize: number | null) => void;

  searchTerm: string;
  setSearchTerm: (searchTerm: string | null) => void;

  activeFilters: ActiveFilters;
  setActiveFilters: ReturnType<typeof useQueryState<ActiveFilters>>[1];

  sorting: SortingState;
  setSorting: OnChangeFn<SortingState>;

  columnVisibility: VisibilityState;
  setColumnVisibility: OnChangeFn<VisibilityState>;

  columnSizing: ColumnSizingState;
  setColumnSizing: OnChangeFn<ColumnSizingState>;

  segmentIdRaw: string | null;
  setSegmentIdRaw: (segmentId: string | null) => void;

  defaultPageSize: number;
  timeZone?: string;

  validateActiveFilters?: ActiveFiltersValidatorState;
};

export const DataTableStateContext = createContext<DataTableStateContextType | null>(null);

export function useDataTableState() {
  const context = useContext(DataTableStateContext);
  if (!context) {
    throw new Error("useDataTableState must be used within a DataTableStateProvider");
  }
  return context;
}

interface DataTableStateProviderProps {
  tableIdentifier: string;
  children: React.ReactNode;
  defaultPageSize?: number;
  ctaContainerClassName?: string;
  timeZone?: string;
  preferredSegmentId?: SegmentIdentifier | null;
  validateActiveFilters?: ActiveFiltersValidatorState;
}

export function DataTableStateProvider({
  tableIdentifier,
  children,
  defaultPageSize = DEFAULT_PAGE_SIZE,
  ctaContainerClassName = CTA_CONTAINER_CLASS_NAME,
  timeZone,
  preferredSegmentId,
  validateActiveFilters,
}: DataTableStateProviderProps) {
  if (!tableIdentifier.trim()) {
    throw new Error("tableIdentifier is required and cannot be empty");
  }

  const filterToOpen = useRef<string | undefined>(undefined);
  const [pageIndex, setPageIndex] = useQueryState("page", pageIndexParser);
  const [pageSize, setPageSize] = useQueryState("size", pageSizeParser);
  const [searchTerm, setSearchTerm] = useQueryState("q", searchTermParser);
  const [activeFilters, setActiveFilters] = useQueryState("activeFilters", activeFiltersParser);
  const [sorting, setSorting] = useQueryState("sorting", sortingParser);
  const [columnVisibility, setColumnVisibility] = useQueryState<VisibilityState>(
    "cols",
    columnVisibilityParser
  );
  const [columnSizing, setColumnSizing] = useQueryState<ColumnSizingState>("widths", columnSizingParser);

  const initialSegmentId = useMemo(
    () => (preferredSegmentId ? String(preferredSegmentId.id) : null),
    [preferredSegmentId]
  );
  const [segmentIdRaw, setSegmentIdRaw] = useQueryState(
    "segment",
    initialSegmentId ? segmentIdParser.withDefault(initialSegmentId) : segmentIdParser
  );

  const ctaContainerRef = useElementByClassName<HTMLDivElement>(ctaContainerClassName);

  const value = useMemo(
    () => ({
      tableIdentifier,
      ctaContainerRef,
      filterToOpen,
      pageIndex,
      setPageIndex,
      pageSize,
      setPageSize,
      searchTerm,
      setSearchTerm,
      activeFilters,
      setActiveFilters,
      sorting,
      setSorting,
      columnVisibility,
      setColumnVisibility,
      columnSizing,
      setColumnSizing,
      segmentIdRaw,
      setSegmentIdRaw,
      defaultPageSize,
      timeZone,
      validateActiveFilters,
    }),
    [
      tableIdentifier,
      ctaContainerRef,
      pageIndex,
      setPageIndex,
      pageSize,
      setPageSize,
      searchTerm,
      setSearchTerm,
      activeFilters,
      setActiveFilters,
      sorting,
      setSorting,
      columnVisibility,
      setColumnVisibility,
      columnSizing,
      setColumnSizing,
      segmentIdRaw,
      setSegmentIdRaw,
      defaultPageSize,
      timeZone,
      validateActiveFilters,
    ]
  );

  return <DataTableStateContext.Provider value={value}>{children}</DataTableStateContext.Provider>;
}

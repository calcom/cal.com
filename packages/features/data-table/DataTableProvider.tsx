"use client";

import type { SortingState, OnChangeFn, VisibilityState, ColumnSizingState } from "@tanstack/react-table";
// eslint-disable-next-line no-restricted-imports
import debounce from "lodash/debounce";
import { usePathname } from "next/navigation";
import { useQueryState } from "nuqs";
import { createContext, useCallback, useEffect, useRef, useMemo } from "react";

import { useSegmentsNoop } from "./hooks/useSegmentsNoop";
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
} from "./lib/parsers";
import {
  type FilterValue,
  type FilterSegmentOutput,
  type ActiveFilters,
  type UseSegments,
} from "./lib/types";
import { CTA_CONTAINER_CLASS_NAME } from "./lib/utils";

export type DataTableContextType = {
  tableIdentifier: string;
  ctaContainerRef: React.RefObject<HTMLDivElement>;
  filterToOpen: React.MutableRefObject<string | undefined>;

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
  setPageIndex: (pageIndex: number | null) => void;
  setPageSize: (pageSize: number | null) => void;

  offset: number;
  limit: number;

  segments: FilterSegmentOutput[];
  selectedSegment: FilterSegmentOutput | undefined;
  segmentId: number | undefined;
  setSegmentId: (id: number | null) => void;
  canSaveSegment: boolean;
  isSegmentEnabled: boolean;

  searchTerm: string;
  setSearchTerm: (searchTerm: string | null) => void;

  timeZone?: string;
};

export const DataTableContext = createContext<DataTableContextType | null>(null);

interface DataTableProviderProps {
  useSegments?: UseSegments;
  tableIdentifier?: string;
  children: React.ReactNode;
  ctaContainerClassName?: string;
  defaultPageSize?: number;
  segments?: FilterSegmentOutput[];
  timeZone?: string;
  preferredSegmentId?: number | null;
}

export function DataTableProvider({
  tableIdentifier: _tableIdentifier,
  children,
  useSegments = useSegmentsNoop,
  defaultPageSize = DEFAULT_PAGE_SIZE,
  ctaContainerClassName = CTA_CONTAINER_CLASS_NAME,
  segments: providedSegments,
  timeZone,
  preferredSegmentId,
}: DataTableProviderProps) {
  const filterToOpen = useRef<string | undefined>(undefined);
  const [activeFilters, setActiveFilters] = useQueryState("activeFilters", activeFiltersParser);
  const [sorting, setSorting] = useQueryState("sorting", sortingParser);
  const [columnVisibility, setColumnVisibility] = useQueryState<VisibilityState>(
    "cols",
    columnVisibilityParser
  );
  const [columnSizing, setColumnSizing] = useQueryState<ColumnSizingState>("widths", columnSizingParser);
  const [segmentId, setSegmentId] = useQueryState(
    "segment",
    segmentIdParser.withDefault(preferredSegmentId ?? -1)
  );
  const [pageIndex, setPageIndex] = useQueryState("page", pageIndexParser);
  const [pageSize, setPageSize] = useQueryState("size", pageSizeParser);
  const [searchTerm, setSearchTerm] = useQueryState("q", searchTermParser);

  const setDebouncedSearchTerm = useMemo(
    () => debounce((value: string | null) => setSearchTerm(value ? value.trim() : null), 500),
    [setSearchTerm]
  );

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

  const setPageIndexWrapper = useCallback(
    (newPageIndex: number | null) => setPageIndex(newPageIndex || null),
    [setPageIndex]
  );

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
    [setActiveFilters, setPageIndex]
  );

  const removeFilter = useCallback(
    (columnId: string) => {
      setPageIndex(null);
      setActiveFilters((prev) => {
        const remainingFilters = prev.filter((filter) => filter.f !== columnId);
        return remainingFilters.length === 0 ? null : remainingFilters;
      });
    },
    [setActiveFilters, setPageIndex]
  );

  const setPageSizeAndGoToFirstPage = useCallback(
    (newPageSize: number | null) => {
      setPageSize(newPageSize === defaultPageSize ? null : newPageSize);
      setPageIndex(null);
    },
    [setPageSize, setPageIndex, defaultPageSize]
  );

  const { segments, selectedSegment, canSaveSegment, setAndPersistSegmentId, isSegmentEnabled } = useSegments(
    {
      tableIdentifier,
      activeFilters,
      sorting,
      columnVisibility,
      columnSizing,
      pageSize,
      searchTerm,
      defaultPageSize,
      segmentId,
      setSegmentId,
      setActiveFilters,
      setSorting,
      setColumnVisibility,
      setColumnSizing,
      setPageSize,
      setPageIndex,
      setSearchTerm,
      segments: providedSegments,
      preferredSegmentId,
    }
  );

  const clearAll = useCallback(
    (exclude?: string[]) => {
      setAndPersistSegmentId(null);
      setPageIndex(null);
      setActiveFilters((prev) => {
        const remainingFilters = prev.filter((filter) => exclude?.includes(filter.f));
        return remainingFilters.length === 0 ? null : remainingFilters;
      });
    },
    [setActiveFilters, setPageIndex, setAndPersistSegmentId]
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
        tableIdentifier,
        ctaContainerRef,
        filterToOpen,
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
        setPageIndex: setPageIndexWrapper,
        setPageSize: setPageSizeAndGoToFirstPage,
        limit: pageSize,
        offset: pageIndex * pageSize,
        segments,
        selectedSegment,
        segmentId: segmentId || undefined,
        setSegmentId: setAndPersistSegmentId,
        canSaveSegment,
        isSegmentEnabled,
        searchTerm,
        setSearchTerm: setDebouncedSearchTerm,
        timeZone,
      }}>
      {children}
    </DataTableContext.Provider>
  );
}

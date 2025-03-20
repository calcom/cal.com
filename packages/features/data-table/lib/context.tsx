"use client";

import type { SortingState, OnChangeFn, VisibilityState, ColumnSizingState } from "@tanstack/react-table";
import { usePathname } from "next/navigation";
import { useQueryState, parseAsArrayOf, parseAsJson, parseAsInteger } from "nuqs";
import { createContext, useCallback, useMemo, useEffect } from "react";

import { trpc } from "@calcom/trpc/react";

import {
  type FilterValue,
  ZSorting,
  ZColumnVisibility,
  ZActiveFilter,
  ZColumnSizing,
  type FilterSegmentOutput,
  type ActiveFilters,
} from "./types";

export type DataTableContextType = {
  tableIdentifier: string;

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
  defaultPageSize?: number;
}

export function DataTableProvider({
  tableIdentifier: _tableIdentifier,
  children,
  defaultPageSize = DEFAULT_PAGE_SIZE,
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
  const { data: segments, isFetching: isFetchingSegments } = trpc.viewer.filterSegments.list.useQuery({
    tableIdentifier,
  });
  const selectedSegment = useMemo(
    () => segments?.find((segment) => segment.id === segmentId),
    [segments, segmentId]
  );

  useEffect(() => {
    if (segments && segmentId > 0 && !isFetchingSegments) {
      const segment = segments.find((segment) => segment.id === segmentId);
      if (!segment) {
        // If segmentId is invalid (or not found), clear the segmentId from the query params,
        // but we still keep all the other states like activeFilters, etc.
        // This is useful when someone shares a URL that is inaccessible to someone else.
        setSegmentId(null);
      }
    }
  }, [segments, segmentId, setSegmentId, isFetchingSegments]);

  useEffect(() => {
    if (selectedSegment) {
      // segment is selected, so we apply the filters, sorting, etc. from the segment
      setActiveFilters(selectedSegment.activeFilters);
      setSorting(selectedSegment.sorting);
      setColumnVisibility(selectedSegment.columnVisibility);
      setColumnSizing(selectedSegment.columnSizing);
      setPageSize(selectedSegment.perPage);
      setPageIndex(0);
    }
  }, [
    selectedSegment,
    setActiveFilters,
    setSorting,
    setColumnVisibility,
    setColumnSizing,
    setPageSize,
    setPageIndex,
  ]);

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

  const canSaveSegment = useMemo(() => {
    if (!selectedSegment) {
      // if no segment is selected, we can save the segment if there are any active filters, sorting, etc.
      return (
        activeFilters.length > 0 ||
        sorting.length > 0 ||
        Object.keys(columnVisibility).length > 0 ||
        Object.keys(columnSizing).length > 0 ||
        pageSize !== defaultPageSize
      );
    } else {
      // if a segment is selected, we can save the segment if the active filters, sorting, etc. are different from the segment
      return (
        activeFilters !== selectedSegment.activeFilters ||
        sorting !== selectedSegment.sorting ||
        columnVisibility !== selectedSegment.columnVisibility ||
        columnSizing !== selectedSegment.columnSizing ||
        pageSize !== selectedSegment.perPage
      );
    }
  }, [selectedSegment, activeFilters, sorting, columnVisibility, columnSizing, pageSize, defaultPageSize]);

  return (
    <DataTableContext.Provider
      value={{
        tableIdentifier,
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
        segments: segments ?? [],
        selectedSegment,
        segmentId: segmentId || undefined,
        setSegmentId,
        canSaveSegment,
      }}>
      {children}
    </DataTableContext.Provider>
  );
}

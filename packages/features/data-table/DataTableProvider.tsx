"use client";

import type { SortingState, OnChangeFn, VisibilityState, ColumnSizingState } from "@tanstack/react-table";
import debounce from "lodash/debounce";
import isEqual from "lodash/isEqual";
import { useQueryState } from "nuqs";
import { createContext, useCallback, useRef, useMemo } from "react";

import { useElementByClassName } from "@calcom/lib/hooks/useElementByClassName";

import { useSegmentManagement, type ActiveFiltersValidatorState } from "./hooks/useSegmentManagement";
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
import type {
  FilterValue,
  FilterSegmentOutput,
  SystemFilterSegment,
  CombinedFilterSegment,
  SegmentIdentifier,
  ActiveFilters,
  UseSegments,
} from "./lib/types";
import { CTA_CONTAINER_CLASS_NAME } from "./lib/utils";

export type { ActiveFiltersValidatorState };

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

  segments: CombinedFilterSegment[];
  selectedSegment: CombinedFilterSegment | undefined;
  segmentId: SegmentIdentifier | null;
  setSegmentId: (id: SegmentIdentifier | null, providedSegment?: CombinedFilterSegment) => void;
  canSaveSegment: boolean;
  isSegmentEnabled: boolean;

  searchTerm: string;
  setSearchTerm: (searchTerm: string | null) => void;

  /**
   * True when a validator is provided but still loading, and there's a segment waiting to be applied.
   * Consumers should disable data fetching while this is true to avoid fetching with unvalidated filters.
   */
  isValidatorPending: boolean;

  timeZone?: string;
};

export const DataTableContext = createContext<DataTableContextType | null>(null);


interface DataTableProviderProps {
  tableIdentifier: string;
  children: React.ReactNode;
  useSegments?: UseSegments;
  ctaContainerClassName?: string;
  defaultPageSize?: number;
  segments?: FilterSegmentOutput[];
  timeZone?: string;
  preferredSegmentId?: SegmentIdentifier | null;
  systemSegments?: SystemFilterSegment[];
  /**
   * Optional validator function to filter out invalid/inaccessible values from activeFilters.
   * This is called when a segment is applied, allowing the caller to validate filter values
   * against accessible resources (e.g., accessible user IDs, event type IDs, team IDs).
   * Invalid values are filtered out in memory without being persisted back to the backend.
   *
   * Can be:
   * - undefined: No validation needed
   * - "loading": Validation data is still loading (segment application will be delayed)
   * - function: Validator is ready to use
   */
  validateActiveFilters?: ActiveFiltersValidatorState;
}

export function DataTableProvider({
  tableIdentifier,
  children,
  useSegments = useSegmentsNoop,
  defaultPageSize = DEFAULT_PAGE_SIZE,
  ctaContainerClassName = CTA_CONTAINER_CLASS_NAME,
  segments: providedSegments,
  timeZone,
  preferredSegmentId,
  systemSegments,
  validateActiveFilters,
}: DataTableProviderProps) {
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
  const [segmentIdFromUrl, rawSetSegmentId] = useQueryState(
    "segment",
    initialSegmentId ? segmentIdParser.withDefault(initialSegmentId) : segmentIdParser
  );

  const {
    segments,
    selectedSegment,
    segmentId,
    setSegmentId,
    isSegmentEnabled,
    isValidatorPending,
    clearSystemSegmentSelectionIfExists,
  } = useSegmentManagement({
    tableIdentifier,
    useSegments,
    providedSegments,
    systemSegments,
    preferredSegmentId,
    initialSegmentId: segmentIdFromUrl,
    validateActiveFilters,
    stateSetters: {
      setActiveFilters,
      setSorting,
      setColumnVisibility,
      setColumnSizing,
      setPageSize,
      setSearchTerm,
      setPageIndex,
    },
    rawSetSegmentId,
  });

  const setDebouncedSearchTerm = useMemo(
    () => debounce((value: string | null) => setSearchTerm(value ? value.trim() : null), 500),
    [setSearchTerm]
  );

  const addFilter = useCallback(
    (columnId: string) => {
      if (!activeFilters?.some((filter) => filter.f === columnId)) {
        // do not reset the page to 0 here,
        // because we don't have the filter value yet (`v: undefined`)
        setActiveFilters([...activeFilters, { f: columnId, v: undefined }]);
        clearSystemSegmentSelectionIfExists();
      }
    },
    [activeFilters, setActiveFilters, clearSystemSegmentSelectionIfExists]
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
      clearSystemSegmentSelectionIfExists();
    },
    [setActiveFilters, setPageIndex, clearSystemSegmentSelectionIfExists]
  );

  const removeFilter = useCallback(
    (columnId: string) => {
      setPageIndex(null);
      setActiveFilters((prev) => {
        const remainingFilters = prev.filter((filter) => filter.f !== columnId);
        return remainingFilters.length === 0 ? null : remainingFilters;
      });
      clearSystemSegmentSelectionIfExists();
    },
    [setActiveFilters, setPageIndex, clearSystemSegmentSelectionIfExists]
  );

  const setPageSizeAndGoToFirstPage = useCallback(
    (newPageSize: number | null) => {
      setPageSize(newPageSize === defaultPageSize ? null : newPageSize);
      setPageIndex(null);
      clearSystemSegmentSelectionIfExists();
    },
    [setPageSize, setPageIndex, defaultPageSize, clearSystemSegmentSelectionIfExists]
  );

  const clearAll = useCallback(
    (exclude?: string[]) => {
      setSegmentId(null);
      setPageIndex(null);
      setActiveFilters((prev) => {
        const remainingFilters = prev.filter((filter) => exclude?.includes(filter.f));
        return remainingFilters.length === 0 ? null : remainingFilters;
      });
    },
    [setActiveFilters, setPageIndex, setSegmentId]
  );

  // Check if current state differs from selected segment
  const hasStateChanged = useMemo(() => {
    if (!selectedSegment) return false;

    return (
      !isEqual(activeFilters, selectedSegment.activeFilters) ||
      !isEqual(sorting, selectedSegment.sorting) ||
      !isEqual(columnVisibility, selectedSegment.columnVisibility) ||
      !isEqual(columnSizing, selectedSegment.columnSizing) ||
      !isEqual(pageSize, selectedSegment.perPage) ||
      !isEqual(searchTerm || "", selectedSegment.searchTerm || "")
    );
  }, [selectedSegment, activeFilters, sorting, columnVisibility, columnSizing, pageSize, searchTerm]);

  const canSaveSegment = useMemo(() => {
    if (selectedSegment) {
      return hasStateChanged;
    }
    // if no segment is selected, we can save the segment if there are any active filters, sorting, etc.
    return (
      activeFilters.length > 0 ||
      sorting.length > 0 ||
      Object.keys(columnVisibility).length > 0 ||
      Object.keys(columnSizing).length > 0 ||
      pageSize !== defaultPageSize ||
      searchTerm?.length > 0
    );
  }, [
    selectedSegment,
    activeFilters,
    sorting,
    columnVisibility,
    columnSizing,
    pageSize,
    searchTerm,
    defaultPageSize,
    hasStateChanged,
  ]);

  const ctaContainerRef = useElementByClassName<HTMLDivElement>(ctaContainerClassName);

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
        segmentId,
        setSegmentId,
        canSaveSegment,
        isSegmentEnabled,
        searchTerm,
        setSearchTerm: setDebouncedSearchTerm,
        isValidatorPending,
        timeZone,
      }}>
      {children}
    </DataTableContext.Provider>
  );
}

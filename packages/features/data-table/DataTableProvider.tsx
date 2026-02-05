"use client";

import type { SortingState, OnChangeFn, VisibilityState, ColumnSizingState } from "@tanstack/react-table";
import debounce from "lodash/debounce";
import isEqual from "lodash/isEqual";
import { useQueryState } from "nuqs";
import { useState, createContext, useCallback, useEffect, useRef, useMemo } from "react";

import { useElementByClassName } from "@calcom/lib/hooks/useElementByClassName";

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
  type SystemFilterSegment,
  type CombinedFilterSegment,
  type SegmentIdentifier,
  type ActiveFilters,
  type UseSegments,
  SYSTEM_SEGMENT_PREFIX,
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

  segments: CombinedFilterSegment[];
  selectedSegment: CombinedFilterSegment | undefined;
  segmentId: SegmentIdentifier | null;
  setSegmentId: (id: SegmentIdentifier | null, providedSegment?: CombinedFilterSegment) => void;
  canSaveSegment: boolean;
  isSegmentEnabled: boolean;

  searchTerm: string;
  setSearchTerm: (searchTerm: string | null) => void;

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
  const [segmentId, _setSegmentId] = useQueryState(
    "segment",
    initialSegmentId ? segmentIdParser.withDefault(initialSegmentId) : segmentIdParser
  );
  const {
    segments,
    preferredSegmentId: fetchedPreferredSegmentId,
    setPreference: setSegmentPreference,
    isSegmentEnabled,
    isSuccess: isSegmentFetchedSuccessfully,
  } = useSegments({
    tableIdentifier,
    providedSegments,
    systemSegments,
  });

  const findSelectedSegment = useCallback(
    (segmentId: string) => {
      return segments.find((segment) => {
        if (
          segment.type === "system" &&
          segmentId &&
          segmentId.startsWith(SYSTEM_SEGMENT_PREFIX) &&
          segment.id === segmentId
        ) {
          return true;
        } else if (segment.type === "user") {
          const segmentIdNumber = parseInt(segmentId, 10);
          return segment.id === segmentIdNumber;
        }
      });
    },
    [segments]
  );

  const segmentIdObject = useMemo(() => {
    if (segmentId && segmentId.startsWith(SYSTEM_SEGMENT_PREFIX)) {
      return {
        id: segmentId,
        type: "system" as const,
      };
    } else {
      const segmentIdNumber = parseInt(segmentId, 10);
      if (!Number.isNaN(segmentIdNumber)) {
        return {
          id: segmentIdNumber,
          type: "user" as const,
        };
      }
    }
    return null;
  }, [segmentId]);

  const [selectedSegment, setSelectedSegment] = useState<CombinedFilterSegment | undefined>(
    findSelectedSegment(segmentId)
  );

  const setSegmentId = useCallback(
    (segmentId: SegmentIdentifier | null, providedSegment?: CombinedFilterSegment) => {
      if (!segmentId) {
        _setSegmentId(null);
        setSelectedSegment(undefined);
        setSegmentPreference({
          tableIdentifier,
          segmentId: null,
        });
        return;
      }

      const segment = providedSegment || findSelectedSegment(String(segmentId.id));
      if (!segment) {
        // If segmentId is invalid (or not found), clear the segmentId from the query params,
        // but we still keep all the other states like activeFilters, etc.
        // This is useful when someone shares a URL that is inaccessible to someone else.
        _setSegmentId(null);
        setSelectedSegment(undefined);
        setSegmentPreference({
          tableIdentifier,
          segmentId: null,
        });
        return;
      }

      _setSegmentId(String(segmentId.id));
      setSelectedSegment(segment);
      setSegmentPreference({
        tableIdentifier,
        segmentId,
      });

      // apply the segment
      setActiveFilters(segment.activeFilters);
      if (segment.sorting) {
        setSorting(segment.sorting);
      }
      if (segment.columnVisibility) {
        setColumnVisibility(segment.columnVisibility);
      }
      if (segment.columnSizing) {
        setColumnSizing(segment.columnSizing);
      }
      if (segment.perPage !== undefined) {
        setPageSize(segment.perPage);
      }
      if (segment.searchTerm !== undefined) {
        setSearchTerm(segment.searchTerm);
      }
      setPageIndex(0);
    },
    [
      _setSegmentId,
      setSelectedSegment,
      setSegmentPreference,
      tableIdentifier,
      findSelectedSegment,
      setActiveFilters,
      setSorting,
      setColumnVisibility,
      setColumnSizing,
      setPageSize,
      setSearchTerm,
      setPageIndex,
    ]
  );

  useEffect(() => {
    if (!isSegmentFetchedSuccessfully) {
      return;
    }
    // If the preferred segment id has been fetched
    // and no segment id has been selected yet,
    // then we set it.
    if (fetchedPreferredSegmentId && !segmentId) {
      setSegmentId(fetchedPreferredSegmentId);
    } else if (segmentId) {
      setSelectedSegment(findSelectedSegment(segmentId));
    }
    // We intentionally have only `isSegmentFetchedSuccessfully`
    // in the dependency array.
  }, [isSegmentFetchedSuccessfully]);

  const clearSystemSegmentSelectionIfExists = useCallback(() => {
    if (selectedSegment?.type === "system") {
      setSegmentId(null);
    }
  }, [selectedSegment, setSegmentId]);

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
        segmentId: segmentIdObject,
        setSegmentId,
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

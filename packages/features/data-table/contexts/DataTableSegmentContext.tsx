"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useSegmentStateMachine } from "../hooks/useSegmentStateMachine";
import { useSegmentsNoop } from "../hooks/useSegmentsNoop";
import type {
  CombinedFilterSegment,
  FilterSegmentOutput,
  SegmentIdentifier,
  SystemFilterSegment,
  UseSegments,
} from "../lib/types";
import { SYSTEM_SEGMENT_PREFIX } from "../lib/types";
import { useDataTableState } from "./DataTableStateContext";

export type DataTableSegmentContextType = {
  segments: CombinedFilterSegment[];
  selectedSegment: CombinedFilterSegment | undefined;
  segmentId: SegmentIdentifier | null;
  setSegmentId: (id: SegmentIdentifier | null, providedSegment?: CombinedFilterSegment) => void;
  isSegmentEnabled: boolean;
  canSaveSegment: boolean;
  isValidatorPending: boolean;
  clearSystemSegmentSelectionIfExists: () => void;
};

export const DataTableSegmentContext = createContext<DataTableSegmentContextType | null>(null);

export function useDataTableSegment() {
  const context = useContext(DataTableSegmentContext);
  if (!context) {
    throw new Error("useDataTableSegment must be used within a DataTableSegmentProvider");
  }
  return context;
}

interface DataTableSegmentProviderProps {
  children: React.ReactNode;
  useSegments?: UseSegments;
  segments?: FilterSegmentOutput[];
  systemSegments?: SystemFilterSegment[];
}

export function DataTableSegmentProvider({
  children,
  useSegments = useSegmentsNoop,
  segments: providedSegments,
  systemSegments,
}: DataTableSegmentProviderProps) {
  const {
    tableIdentifier,
    activeFilters,
    setActiveFilters,
    sorting,
    setSorting,
    columnVisibility,
    setColumnVisibility,
    columnSizing,
    setColumnSizing,
    pageSize,
    setPageSize,
    searchTerm,
    setSearchTerm,
    setPageIndex,
    segmentIdRaw,
    setSegmentIdRaw,
    defaultPageSize,
    validateActiveFilters,
  } = useDataTableState();

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
        }
        if (segment.type === "user") {
          const segmentIdNumber = parseInt(segmentId, 10);
          return segment.id === segmentIdNumber;
        }
        return false;
      });
    },
    [segments]
  );

  const applySegmentFilters = useCallback(
    (segment: CombinedFilterSegment) => {
      const filtersToApply =
        typeof validateActiveFilters === "function"
          ? validateActiveFilters(segment.activeFilters)
          : segment.activeFilters;
      setActiveFilters(filtersToApply);
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
      validateActiveFilters,
      setActiveFilters,
      setSorting,
      setColumnVisibility,
      setColumnSizing,
      setPageSize,
      setSearchTerm,
      setPageIndex,
    ]
  );

  const isValidatorReady = validateActiveFilters !== "loading";

  const {
    selectedSegment,
    segmentId: segmentIdFromMachine,
    isValidatorPending,
    selectSegment,
    clearSegment,
    clearSystemSegmentIfExists,
  } = useSegmentStateMachine({
    segments,
    isSegmentsFetched: isSegmentFetchedSuccessfully,
    preferredSegmentId: fetchedPreferredSegmentId,
    isValidatorReady,
    segmentIdFromUrl: segmentIdRaw,
    findSegment: findSelectedSegment,
    onApplyFilters: applySegmentFilters,
    onSetUrlSegmentId: setSegmentIdRaw,
    onSetPreference: setSegmentPreference,
    tableIdentifier,
  });

  // Wrapper for setSegmentId to match the existing API
  const setSegmentId = useCallback(
    (segmentId: SegmentIdentifier | null, providedSegment?: CombinedFilterSegment) => {
      if (!segmentId) {
        clearSegment();
        return;
      }

      const segment = providedSegment || findSelectedSegment(String(segmentId.id));
      if (!segment) {
        clearSegment();
        return;
      }

      selectSegment(segmentId, segment);
    },
    [clearSegment, selectSegment, findSelectedSegment]
  );

  const hasStateChanged = useMemo(() => {
    if (!selectedSegment) return false;

    const isEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

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
    return (
      activeFilters.length > 0 ||
      sorting.length > 0 ||
      Object.keys(columnVisibility).length > 0 ||
      Object.keys(columnSizing).length > 0 ||
      pageSize !== defaultPageSize ||
      (searchTerm?.length ?? 0) > 0
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

  const value = useMemo(
    () => ({
      segments,
      selectedSegment: selectedSegment ?? undefined,
      segmentId: segmentIdFromMachine,
      setSegmentId,
      isSegmentEnabled,
      canSaveSegment,
      isValidatorPending,
      clearSystemSegmentSelectionIfExists: clearSystemSegmentIfExists,
    }),
    [
      segments,
      selectedSegment,
      segmentIdFromMachine,
      setSegmentId,
      isSegmentEnabled,
      canSaveSegment,
      isValidatorPending,
      clearSystemSegmentIfExists,
    ]
  );

  return <DataTableSegmentContext.Provider value={value}>{children}</DataTableSegmentContext.Provider>;
}

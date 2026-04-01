"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from "react";

import { useSegmentsNoop } from "../hooks/useSegmentsNoop";
import type {
  FilterSegmentOutput,
  SystemFilterSegment,
  CombinedFilterSegment,
  SegmentIdentifier,
  UseSegments,
} from "@calcom/features/data-table/lib/types";
import { SYSTEM_SEGMENT_PREFIX } from "@calcom/features/data-table/lib/types";
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
        } else if (segment.type === "user") {
          const segmentIdNumber = parseInt(segmentId, 10);
          return segment.id === segmentIdNumber;
        }
      });
    },
    [segments]
  );

  const segmentIdObject = useMemo(() => {
    if (segmentIdRaw && segmentIdRaw.startsWith(SYSTEM_SEGMENT_PREFIX)) {
      return {
        id: segmentIdRaw,
        type: "system" as const,
      };
    } else if (segmentIdRaw) {
      const segmentIdNumber = parseInt(segmentIdRaw, 10);
      if (!Number.isNaN(segmentIdNumber)) {
        return {
          id: segmentIdNumber,
          type: "user" as const,
        };
      }
    }
    return null;
  }, [segmentIdRaw]);

  const [selectedSegment, setSelectedSegment] = useState<CombinedFilterSegment | undefined>(
    segmentIdRaw ? findSelectedSegment(segmentIdRaw) : undefined
  );

  const pendingSegmentRef = useRef<{
    segmentId: SegmentIdentifier;
    segment: CombinedFilterSegment;
  } | null>(null);

  // Tracks whether the initialization effect has run at least once for this
  // component instance. Distinguishes "first load" (should apply preferred
  // segment) from "user deselected" (should not re-apply). Resets on
  // remount but persists when Next.js reuses the component across navigations.
  const isInitializedRef = useRef(false);

  const isValidatorReady = validateActiveFilters !== "loading";

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

  const setSegmentId = useCallback(
    (segmentId: SegmentIdentifier | null, providedSegment?: CombinedFilterSegment) => {
      if (!segmentId) {
        pendingSegmentRef.current = null;
        setSegmentIdRaw(null);
        setSelectedSegment(undefined);
        setSegmentPreference({
          tableIdentifier,
          segmentId: null,
        });
        return;
      }

      const segment = providedSegment || findSelectedSegment(String(segmentId.id));
      if (!segment) {
        pendingSegmentRef.current = null;
        setSegmentIdRaw(null);
        setSelectedSegment(undefined);
        setSegmentPreference({
          tableIdentifier,
          segmentId: null,
        });
        return;
      }

      setSegmentIdRaw(String(segmentId.id));
      setSelectedSegment(segment);
      setSegmentPreference({
        tableIdentifier,
        segmentId,
      });

      if (validateActiveFilters === "loading") {
        pendingSegmentRef.current = { segmentId, segment };
        return;
      }

      pendingSegmentRef.current = null;
      applySegmentFilters(segment);
    },
    [
      setSegmentIdRaw,
      setSegmentPreference,
      tableIdentifier,
      findSelectedSegment,
      validateActiveFilters,
      applySegmentFilters,
    ]
  );

  useEffect(() => {
    if (!isValidatorReady || !pendingSegmentRef.current) {
      return;
    }
    const { segment } = pendingSegmentRef.current;
    pendingSegmentRef.current = null;
    applySegmentFilters(segment);
  }, [isValidatorReady, applySegmentFilters]);

  // Segment initialization / re-initialization effect.
  //
  // Three scenarios handled:
  // 1. First load (no URL params)       → apply the user's preferred segment
  // 2. First load (URL has segment=X)   → resolve segment from URL
  // 3. Navigation back                  → URL was cleared by soft navigation,
  //    but React state (selectedSegment) was preserved because Next.js reused
  //    the component instance. Re-apply the preferred segment.
  //
  // "User deselected" is safe: setSegmentId(null) clears both segmentIdRaw
  // and selectedSegment in the same batched update, so selectedSegment is
  // undefined and isInitializedRef is true — neither branch fires.
  useEffect(() => {
    if (!isSegmentFetchedSuccessfully) return;

    if (fetchedPreferredSegmentId && !segmentIdRaw) {
      if (selectedSegment !== undefined) {
        // Case 3 – navigation back: URL cleared but component state preserved
        setSegmentId(fetchedPreferredSegmentId);
      } else if (!isInitializedRef.current) {
        // Case 1 – first load with preferred segment
        setSegmentId(fetchedPreferredSegmentId);
      }
    } else if (segmentIdRaw && !isInitializedRef.current) {
      // Case 2 – first load with segment already in URL
      const segment = findSelectedSegment(segmentIdRaw);
      setSelectedSegment(segment);
      if (segment) {
        if (validateActiveFilters === "loading") {
          pendingSegmentRef.current = {
            segmentId: segmentIdObject!,
            segment,
          };
        } else {
          applySegmentFilters(segment);
        }
      }
    }

    // Mark as initialized once segment data is available, regardless of
    // whether a segment was applied. Without this, pages that have no
    // preferred segment and no segment in the URL (e.g. org members list)
    // would leave isInitializedRef false, causing the effect to
    // incorrectly treat later user-initiated segment selections as
    // "first load with URL params" and re-run initialization logic.
    isInitializedRef.current = true;
  }, [
    isSegmentFetchedSuccessfully,
    fetchedPreferredSegmentId,
    segmentIdRaw,
    selectedSegment,
    setSegmentId,
    findSelectedSegment,
    validateActiveFilters,
    segmentIdObject,
    applySegmentFilters,
  ]);

  const clearSystemSegmentSelectionIfExists = useCallback(() => {
    if (selectedSegment?.type === "system") {
      setSegmentId(null);
    }
  }, [selectedSegment, setSegmentId]);

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

  const isValidatorPending = validateActiveFilters === "loading" && pendingSegmentRef.current !== null;

  const value = useMemo(
    () => ({
      segments,
      selectedSegment,
      segmentId: segmentIdObject,
      setSegmentId,
      isSegmentEnabled,
      canSaveSegment,
      isValidatorPending,
      clearSystemSegmentSelectionIfExists,
    }),
    [
      segments,
      selectedSegment,
      segmentIdObject,
      setSegmentId,
      isSegmentEnabled,
      canSaveSegment,
      isValidatorPending,
      clearSystemSegmentSelectionIfExists,
    ]
  );

  return <DataTableSegmentContext.Provider value={value}>{children}</DataTableSegmentContext.Provider>;
}

"use client";

import type { SortingState, VisibilityState, ColumnSizingState } from "@tanstack/react-table";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";

import type {
  ActiveFilters,
  ActiveFiltersValidatorState,
  CombinedFilterSegment,
  SegmentIdentifier,
  UseSegments,
} from "../lib/types";
import { SYSTEM_SEGMENT_PREFIX } from "../lib/types";

/**
 * Type for nuqs-style setters that accept value or updater function and return Promise.
 * This matches the signature returned by useQueryState from nuqs.
 */
type NuqsSetter<T> = (
  value: T | null | ((old: T | null) => T | null),
  options?: { history?: "push" | "replace"; scroll?: boolean; shallow?: boolean }
) => Promise<URLSearchParams>;

export type SegmentStateSetters = {
  setActiveFilters: NuqsSetter<ActiveFilters>;
  setSorting: NuqsSetter<SortingState>;
  setColumnVisibility: NuqsSetter<VisibilityState>;
  setColumnSizing: NuqsSetter<ColumnSizingState>;
  setPageSize: NuqsSetter<number>;
  setSearchTerm: NuqsSetter<string>;
  setPageIndex: NuqsSetter<number>;
};

export type UseSegmentManagementOptions = {
  tableIdentifier: string;
  useSegments: UseSegments;
  providedSegments?: Parameters<UseSegments>[0]["providedSegments"];
  systemSegments?: Parameters<UseSegments>[0]["systemSegments"];
  preferredSegmentId?: SegmentIdentifier | null;
  initialSegmentId: string | null;
  validateActiveFilters?: ActiveFiltersValidatorState;
  stateSetters: SegmentStateSetters;
  rawSetSegmentId: (id: string | null) => void;
};

export function useSegmentManagement({
  tableIdentifier,
  useSegments: useSegmentsHook,
  providedSegments,
  systemSegments,
  preferredSegmentId,
  initialSegmentId,
  validateActiveFilters,
  stateSetters,
  rawSetSegmentId,
}: UseSegmentManagementOptions) {
  const {
    setActiveFilters,
    setSorting,
    setColumnVisibility,
    setColumnSizing,
    setPageSize,
    setSearchTerm,
    setPageIndex,
  } = stateSetters;

  const {
    segments,
    preferredSegmentId: fetchedPreferredSegmentId,
    setPreference: setSegmentPreference,
    isSegmentEnabled,
    isSuccess: isSegmentFetchedSuccessfully,
  } = useSegmentsHook({
    tableIdentifier,
    providedSegments,
    systemSegments,
  });

  const findSelectedSegment = useCallback(
    (segmentId: string | null) => {
      if (!segmentId) return undefined;
      return segments.find((segment) => {
        if (
          segment.type === "system" &&
          segmentId.startsWith(SYSTEM_SEGMENT_PREFIX) &&
          segment.id === segmentId
        ) {
          return true;
        } else if (segment.type === "user") {
          const segmentIdNumber = parseInt(segmentId, 10);
          return segment.id === segmentIdNumber;
        }
        return false;
      });
    },
    [segments]
  );

  const segmentIdObject = useMemo(() => {
    if (initialSegmentId && initialSegmentId.startsWith(SYSTEM_SEGMENT_PREFIX)) {
      return { id: initialSegmentId, type: "system" as const };
    } else if (initialSegmentId) {
      const segmentIdNumber = parseInt(initialSegmentId, 10);
      if (!Number.isNaN(segmentIdNumber)) {
        return { id: segmentIdNumber, type: "user" as const };
      }
    }
    return null;
  }, [initialSegmentId]);

  const [selectedSegment, setSelectedSegment] = useState<CombinedFilterSegment | undefined>(
    findSelectedSegment(initialSegmentId)
  );

  const pendingSegmentRef = useRef<{
    segmentId: SegmentIdentifier;
    segment: CombinedFilterSegment;
  } | null>(null);

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
        rawSetSegmentId(null);
        setSelectedSegment(undefined);
        setSegmentPreference({ tableIdentifier, segmentId: null });
        return;
      }

      const segment = providedSegment || findSelectedSegment(String(segmentId.id));
      if (!segment) {
        pendingSegmentRef.current = null;
        rawSetSegmentId(null);
        setSelectedSegment(undefined);
        setSegmentPreference({ tableIdentifier, segmentId: null });
        return;
      }

      rawSetSegmentId(String(segmentId.id));
      setSelectedSegment(segment);
      setSegmentPreference({ tableIdentifier, segmentId });

      if (validateActiveFilters === "loading") {
        pendingSegmentRef.current = { segmentId, segment };
        return;
      }

      pendingSegmentRef.current = null;
      applySegmentFilters(segment);
    },
    [rawSetSegmentId, setSegmentPreference, tableIdentifier, findSelectedSegment, validateActiveFilters, applySegmentFilters]
  );

  useEffect(() => {
    if (!isValidatorReady || !pendingSegmentRef.current) return;
    const { segment } = pendingSegmentRef.current;
    pendingSegmentRef.current = null;
    applySegmentFilters(segment);
  }, [isValidatorReady, applySegmentFilters]);

  useEffect(() => {
    if (!isSegmentFetchedSuccessfully) return;
    if (fetchedPreferredSegmentId && !initialSegmentId) {
      setSegmentId(fetchedPreferredSegmentId);
    } else if (initialSegmentId) {
      setSelectedSegment(findSelectedSegment(initialSegmentId));
    }
  }, [isSegmentFetchedSuccessfully]);

  const clearSystemSegmentSelectionIfExists = useCallback(() => {
    if (selectedSegment?.type === "system") {
      setSegmentId(null);
    }
  }, [selectedSegment, setSegmentId]);

  const isValidatorPending = validateActiveFilters === "loading" && pendingSegmentRef.current !== null;

  return {
    segments,
    selectedSegment,
    segmentId: segmentIdObject,
    setSegmentId,
    isSegmentEnabled,
    isValidatorPending,
    clearSystemSegmentSelectionIfExists,
  };
}

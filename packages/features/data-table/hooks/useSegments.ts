// eslint-disable-next-line no-restricted-imports
import { isEqual } from "lodash";
import { useCallback, useMemo, useEffect } from "react";

import { trpc } from "@calcom/trpc/react";

import { recalculateDateRange } from "../lib/dateRange";
import {
  type UseSegments,
  type SegmentIdentifier,
  type CombinedFilterSegment,
  SYSTEM_SEGMENT_PREFIX,
} from "../lib/types";
import { isDateRangeFilterValue } from "../lib/utils";

// Custom hook to manage segment ID lifecycle and prevent race conditions
const useSegmentIdManager = ({
  segments,
  segmentId,
  setSegmentId,
  isFetchingSegments,
  preferredSegmentId,
  rawSegments,
  selectedSegment,
  hasStateChanged,
}: {
  segments: CombinedFilterSegment[];
  segmentId: SegmentIdentifier | null;
  setSegmentId: (id: SegmentIdentifier | null) => void;
  isFetchingSegments: boolean;
  preferredSegmentId?: SegmentIdentifier | null;
  rawSegments?: { preferredSegmentId?: SegmentIdentifier | null };
  selectedSegment: CombinedFilterSegment | undefined;
  hasStateChanged: boolean;
}) => {
  const memoizedPreferredSegmentId = useMemo(
    () => preferredSegmentId ?? rawSegments?.preferredSegmentId,
    [preferredSegmentId, rawSegments]
  );

  // Consolidated effect to handle segment ID lifecycle and prevent race conditions
  useEffect(() => {
    if (!isFetchingSegments) {
      // If we have a preferred segment and no valid current segment, use preferred
      if (memoizedPreferredSegmentId && segments.length > 0) {
        const hasValidCurrentSegment =
          segmentId &&
          segments.find((segment) => segmentId.type === segment.type && segmentId.id === segment.id);

        if (!hasValidCurrentSegment || (segmentId?.id === -1 && segmentId?.type === "user")) {
          setSegmentId(memoizedPreferredSegmentId);
          return;
        }
      }

      // Clear invalid segments (but not preferred ones we're trying to set)
      if (segments.length > 0 && segmentId) {
        const matchingSegment = segments.find(
          (segment) => segmentId.type === segment.type && segmentId.id === segment.id
        );
        if (!matchingSegment) {
          // If segmentId is invalid (or not found), clear the segmentId from the query params,
          // but we still keep all the other states like activeFilters, etc.
          // This is useful when someone shares a URL that is inaccessible to someone else.
          setSegmentId(null);
        }
      }
    }
  }, [segments, segmentId, setSegmentId, isFetchingSegments, memoizedPreferredSegmentId]);

  // Auto-clear system segment selection when user modifies filters
  useEffect(() => {
    if (selectedSegment && selectedSegment.type === "system" && hasStateChanged) {
      setSegmentId(null);
    }
  }, [selectedSegment, hasStateChanged, setSegmentId]);
};

export const useSegments: UseSegments = ({
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
  systemSegments,
}) => {
  const { data: rawSegments, isFetching: isFetchingSegments } = trpc.viewer.filterSegments.list.useQuery(
    {
      tableIdentifier,
    },
    {
      enabled: !providedSegments, // Only fetch if segments are not provided
    }
  );
  const { mutate: setPreference } = trpc.viewer.filterSegments.setPreference.useMutation();

  const segments = useMemo(() => {
    const userSegments = providedSegments || rawSegments?.segments || [];

    const processedSystemSegments = (systemSegments || []).map((segment) => ({
      tableIdentifier,
      sorting: [],
      columnVisibility: {},
      columnSizing: {},
      perPage: 10,
      searchTerm: null,
      ...segment,
      id: `${SYSTEM_SEGMENT_PREFIX}${segment.id}`,
      type: "system" as const,
      activeFilters: segment.activeFilters.map((filter) => {
        if (isDateRangeFilterValue(filter.v)) {
          return {
            ...filter,
            v: recalculateDateRange(filter.v),
          };
        }
        return filter;
      }),
    }));

    const processedUserSegments = userSegments.map((segment) => ({
      ...segment,
      type: "user" as const,
      activeFilters: segment.activeFilters.map((filter) => {
        if (isDateRangeFilterValue(filter.v)) {
          return {
            ...filter,
            v: recalculateDateRange(filter.v),
          };
        }
        return filter;
      }),
    }));

    return [...processedSystemSegments, ...processedUserSegments];
  }, [rawSegments, providedSegments, systemSegments, tableIdentifier]);

  const selectedSegment = useMemo(() => {
    if (!segmentId) return undefined;

    return segments?.find((segment) => segmentId.type === segment.type && segmentId.id === segment.id);
  }, [segments, segmentId]);

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

  useSegmentIdManager({
    segments,
    segmentId,
    setSegmentId,
    isFetchingSegments,
    preferredSegmentId,
    rawSegments,
    selectedSegment,
    hasStateChanged,
  });

  // Apply segment settings to table state when a segment is selected
  useEffect(() => {
    if (selectedSegment) {
      // segment is selected, so we apply the filters, sorting, etc. from the segment
      setActiveFilters(selectedSegment.activeFilters);
      setSorting(selectedSegment.sorting);
      setColumnVisibility(selectedSegment.columnVisibility);
      setColumnSizing(selectedSegment.columnSizing);
      setPageSize(selectedSegment.perPage);
      setSearchTerm(selectedSegment.searchTerm);
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
    setSearchTerm,
  ]);

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

  const setAndPersistSegmentId = useCallback(
    (segmentId: SegmentIdentifier | null) => {
      setSegmentId(segmentId);
      setPreference({
        tableIdentifier,
        segmentId,
      });
    },
    [tableIdentifier, setSegmentId, setPreference]
  );

  return {
    segments: segments ?? [],
    selectedSegment,
    canSaveSegment,
    setAndPersistSegmentId,
    isSegmentEnabled: true,
  };
};

// eslint-disable-next-line no-restricted-imports
import { isEqual } from "lodash";
import { useCallback, useMemo, useEffect } from "react";

import { trpc } from "@calcom/trpc/react";

import { recalculateDateRange } from "../lib/dateRange";
import { type UseSegments, type SegmentIdentifier } from "../lib/types";
import { isDateRangeFilterValue } from "../lib/utils";

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
  defaultSegments = [],
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
    const segmentsSource = providedSegments || rawSegments?.segments;
    const userSegments = segmentsSource || [];

    const processedDefaultSegments = defaultSegments.map((segment) => ({
      ...segment,
      type: "default" as const,
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
      type: "custom" as const,
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

    return [...processedDefaultSegments, ...processedUserSegments];
  }, [rawSegments, providedSegments, defaultSegments]);

  const selectedSegment = useMemo(() => {
    if (!segmentId) return undefined;

    return segments?.find((segment) => {
      if (segment.type === "default") {
        return segmentId.type === "default" && segment.id === segmentId.id;
      } else {
        return segmentId.type === "custom" && segment.id === segmentId.id;
      }
    });
  }, [segments, segmentId]);

  useEffect(() => {
    if (segments && segmentId && !isFetchingSegments) {
      const segment = segments.find((segment) => {
        if (segment.type === "default") {
          return segmentId.type === "default" && segment.id === segmentId.id;
        } else {
          return segmentId.type === "custom" && segment.id === segmentId.id;
        }
      });
      if (!segment) {
        // If segmentId is invalid (or not found), clear the segmentId from the query params,
        // but we still keep all the other states like activeFilters, etc.
        // This is useful when someone shares a URL that is inaccessible to someone else.
        setSegmentId(null);
      }
    }
  }, [segments, segmentId, setSegmentId, isFetchingSegments]);

  const memoizedPreferredSegmentId = useMemo(
    () => preferredSegmentId ?? rawSegments?.preferredSegmentId,
    [preferredSegmentId, rawSegments]
  );

  useEffect(() => {
    if (memoizedPreferredSegmentId) {
      if (typeof memoizedPreferredSegmentId === "object") {
        setSegmentId(memoizedPreferredSegmentId);
      } else if (typeof memoizedPreferredSegmentId === "string") {
        setSegmentId({ id: memoizedPreferredSegmentId, type: "default" });
      } else if (typeof memoizedPreferredSegmentId === "number") {
        setSegmentId({ id: memoizedPreferredSegmentId, type: "custom" });
      }
    }
  }, [memoizedPreferredSegmentId, setSegmentId]);

  useEffect(() => {
    if (selectedSegment) {
      // segment is selected, so we apply the filters, sorting, etc. from the segment
      setActiveFilters(selectedSegment.activeFilters);
      setSorting(selectedSegment.sorting || []);
      setColumnVisibility(selectedSegment.columnVisibility || {});
      setColumnSizing(selectedSegment.columnSizing || {});
      setPageSize(selectedSegment.perPage || defaultPageSize);
      setSearchTerm(selectedSegment.searchTerm || null);
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
    if (!selectedSegment) {
      // if no segment is selected, we can save the segment if there are any active filters, sorting, etc.
      return (
        activeFilters.length > 0 ||
        sorting.length > 0 ||
        Object.keys(columnVisibility).length > 0 ||
        Object.keys(columnSizing).length > 0 ||
        pageSize !== defaultPageSize ||
        searchTerm?.length > 0
      );
    } else {
      // if a segment is selected, we can save the segment if the active filters, sorting, etc. are different from the segment
      return (
        !isEqual(activeFilters, selectedSegment.activeFilters) ||
        !isEqual(sorting, selectedSegment.sorting) ||
        !isEqual(columnVisibility, selectedSegment.columnVisibility) ||
        !isEqual(columnSizing, selectedSegment.columnSizing) ||
        !isEqual(pageSize, selectedSegment.perPage) ||
        !isEqual(searchTerm, selectedSegment.searchTerm)
      );
    }
  }, [
    selectedSegment,
    activeFilters,
    sorting,
    columnVisibility,
    columnSizing,
    pageSize,
    searchTerm,
    defaultPageSize,
  ]);

  const setAndPersistSegmentId = useCallback(
    (segmentId: SegmentIdentifier) => {
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

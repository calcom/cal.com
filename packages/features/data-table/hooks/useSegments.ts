// eslint-disable-next-line no-restricted-imports
import { isEqual } from "lodash";
import { useCallback, useMemo, useEffect } from "react";

import { trpc } from "@calcom/trpc/react";

import { ZSegmentStorage, type UseSegments } from "../lib/types";

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
}) => {
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
    // this hook doesn't include segmentId in the dependency array
    // because we want to only run this once, when the component mounts
    if (segmentId === -1) {
      const segments = getSegmentsFromLocalStorage();
      if (segments[tableIdentifier]) {
        setSegmentId(segments[tableIdentifier].segmentId);
      }
    }
  }, [tableIdentifier, setSegmentId]);

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
    (segmentId: number | null) => {
      setSegmentId(segmentId);
      saveSegmentToLocalStorage({ tableIdentifier, segmentId });
    },
    [tableIdentifier, setSegmentId]
  );

  return {
    segments: segments ?? [],
    selectedSegment,
    canSaveSegment,
    setAndPersistSegmentId,
    isSegmentEnabled: true,
  };
};

const LOCAL_STORAGE_KEY = "data-table:segments";

function getSegmentsFromLocalStorage() {
  try {
    return ZSegmentStorage.parse(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) ?? "{}"));
  } catch {
    return {};
  }
}

function saveSegmentToLocalStorage({
  tableIdentifier,
  segmentId,
}: {
  tableIdentifier: string;
  segmentId: number | null;
}) {
  const segments = getSegmentsFromLocalStorage();
  if (segmentId) {
    segments[tableIdentifier] = { segmentId };
  } else {
    delete segments[tableIdentifier];
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(segments));
}

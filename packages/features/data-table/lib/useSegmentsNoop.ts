import type { SortingState, VisibilityState, ColumnSizingState } from "@tanstack/react-table";
import { useCallback } from "react";

import { type ActiveFilters, type FilterSegmentOutput } from "./types";

type UseSegmentsNoopProps = {
  tableIdentifier: string;
  activeFilters: ActiveFilters;
  sorting: SortingState;
  columnVisibility: VisibilityState;
  columnSizing: ColumnSizingState;
  pageSize: number;
  defaultPageSize: number;
  segmentId: number;
  setSegmentId: (segmentId: number | null) => void;
  setActiveFilters: (activeFilters: ActiveFilters) => void;
  setSorting: (sorting: SortingState) => void;
  setColumnVisibility: (columnVisibility: VisibilityState) => void;
  setColumnSizing: (columnSizing: ColumnSizingState) => void;
  setPageSize: (pageSize: number) => void;
  setPageIndex: (pageIndex: number) => void;
};

/**
 * A no-operation (noop) implementation of useSegments for documentation and testing purposes.
 * This hook returns empty values and does nothing when functions are called.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useSegmentsNoop({ ...props }: UseSegmentsNoopProps) {
  const setSegmentIdAndSaveToLocalStorage = useCallback(
    (segmentId: number | null) => {
      props.setSegmentId(segmentId);
    },
    [props]
  );

  return {
    segments: [] as FilterSegmentOutput[],
    selectedSegment: undefined,
    canSaveSegment: false,
    setSegmentIdAndSaveToLocalStorage,
  };
}

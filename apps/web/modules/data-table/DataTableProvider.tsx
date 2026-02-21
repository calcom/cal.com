"use client";

import type { SortingState, OnChangeFn, VisibilityState, ColumnSizingState } from "@tanstack/react-table";
import { createContext, useMemo } from "react";

import {
  DataTableStateProvider,
  DataTableSegmentProvider,
  DataTableFiltersProvider,
  useDataTableState,
  useDataTableSegment,
  useDataTableFilters,
} from "./contexts";
import type { ActiveFiltersValidatorState } from "./contexts";
import type {
  FilterValue,
  FilterSegmentOutput,
  SystemFilterSegment,
  CombinedFilterSegment,
  SegmentIdentifier,
  ActiveFilters,
  UseSegments,
} from "@calcom/features/data-table/lib/types";

export type { ActiveFiltersValidatorState };
export type { ActiveFiltersValidator } from "./contexts";

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
  validateActiveFilters?: ActiveFiltersValidatorState;
}

function DataTableContextBridge({ children }: { children: React.ReactNode }) {
  const state = useDataTableState();
  const segment = useDataTableSegment();
  const filters = useDataTableFilters();

  const value = useMemo<DataTableContextType>(
    () => ({
      tableIdentifier: state.tableIdentifier,
      ctaContainerRef: state.ctaContainerRef,
      filterToOpen: state.filterToOpen,

      activeFilters: filters.activeFilters,
      addFilter: filters.addFilter,
      updateFilter: filters.updateFilter,
      removeFilter: filters.removeFilter,
      clearAll: filters.clearAll,

      sorting: state.sorting,
      setSorting: state.setSorting,

      columnVisibility: state.columnVisibility,
      setColumnVisibility: state.setColumnVisibility,

      columnSizing: state.columnSizing,
      setColumnSizing: state.setColumnSizing,

      pageIndex: filters.pageIndex,
      pageSize: filters.pageSize,
      setPageIndex: filters.setPageIndex,
      setPageSize: filters.setPageSize,

      offset: filters.offset,
      limit: filters.limit,

      segments: segment.segments,
      selectedSegment: segment.selectedSegment,
      segmentId: segment.segmentId,
      setSegmentId: segment.setSegmentId,
      canSaveSegment: segment.canSaveSegment,
      isSegmentEnabled: segment.isSegmentEnabled,

      searchTerm: filters.searchTerm,
      setSearchTerm: filters.setSearchTerm,

      isValidatorPending: segment.isValidatorPending,

      timeZone: state.timeZone,
    }),
    [state, segment, filters]
  );

  return <DataTableContext.Provider value={value}>{children}</DataTableContext.Provider>;
}

export function DataTableProvider({
  tableIdentifier,
  children,
  useSegments,
  defaultPageSize,
  ctaContainerClassName,
  segments: providedSegments,
  timeZone,
  preferredSegmentId,
  systemSegments,
  validateActiveFilters,
}: DataTableProviderProps) {
  return (
    <DataTableStateProvider
      tableIdentifier={tableIdentifier}
      defaultPageSize={defaultPageSize}
      ctaContainerClassName={ctaContainerClassName}
      timeZone={timeZone}
      preferredSegmentId={preferredSegmentId}
      validateActiveFilters={validateActiveFilters}>
      <DataTableSegmentProvider
        useSegments={useSegments}
        segments={providedSegments}
        systemSegments={systemSegments}>
        <DataTableFiltersProvider>
          <DataTableContextBridge>{children}</DataTableContextBridge>
        </DataTableFiltersProvider>
      </DataTableSegmentProvider>
    </DataTableStateProvider>
  );
}

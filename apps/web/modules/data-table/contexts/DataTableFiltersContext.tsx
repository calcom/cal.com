"use client";

import debounce from "lodash/debounce";
import { createContext, useContext, useCallback, useMemo, useEffect } from "react";

import type { FilterValue, ActiveFilters } from "@calcom/features/data-table/lib/types";
import { useDataTableSegment } from "./DataTableSegmentContext";
import { useDataTableState } from "./DataTableStateContext";

export type DataTableFiltersContextType = {
  activeFilters: ActiveFilters;
  addFilter: (columnId: string) => void;
  updateFilter: (columnId: string, value: FilterValue) => void;
  removeFilter: (columnId: string) => void;
  clearAll: (exclude?: string[]) => void;

  searchTerm: string;
  setSearchTerm: (searchTerm: string | null) => void;

  pageIndex: number;
  pageSize: number;
  setPageIndex: (pageIndex: number | null) => void;
  setPageSize: (pageSize: number | null) => void;
  offset: number;
  limit: number;
};

export const DataTableFiltersContext = createContext<DataTableFiltersContextType | null>(null);

export function useDataTableFilters() {
  const context = useContext(DataTableFiltersContext);
  if (!context) {
    throw new Error("useDataTableFilters must be used within a DataTableFiltersProvider");
  }
  return context;
}

interface DataTableFiltersProviderProps {
  children: React.ReactNode;
}

export function DataTableFiltersProvider({ children }: DataTableFiltersProviderProps) {
  const {
    activeFilters,
    setActiveFilters,
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
    searchTerm,
    setSearchTerm,
    defaultPageSize,
  } = useDataTableState();

  const { setSegmentId, clearSystemSegmentSelectionIfExists } = useDataTableSegment();

  const setDebouncedSearchTerm = useMemo(
    () => debounce((value: string | null) => setSearchTerm(value ? value.trim() : null), 500),
    [setSearchTerm]
  );

  useEffect(() => {
    return () => {
      setDebouncedSearchTerm.cancel();
    };
  }, [setDebouncedSearchTerm]);

  const addFilter = useCallback(
    (columnId: string) => {
      if (!activeFilters?.some((filter) => filter.f === columnId)) {
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
        const filters = prev ?? [];
        let added = false;
        const newFilters = filters.map((item) => {
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
        const filters = prev ?? [];
        const remainingFilters = filters.filter((filter) => filter.f !== columnId);
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
        const filters = prev ?? [];
        const remainingFilters = filters.filter((filter) => exclude?.includes(filter.f));
        return remainingFilters.length === 0 ? null : remainingFilters;
      });
    },
    [setActiveFilters, setPageIndex, setSegmentId]
  );

  const value = useMemo(
    () => ({
      activeFilters,
      addFilter,
      updateFilter,
      removeFilter,
      clearAll,
      searchTerm,
      setSearchTerm: setDebouncedSearchTerm,
      pageIndex,
      pageSize,
      setPageIndex: setPageIndexWrapper,
      setPageSize: setPageSizeAndGoToFirstPage,
      offset: pageIndex * pageSize,
      limit: pageSize,
    }),
    [
      activeFilters,
      addFilter,
      updateFilter,
      removeFilter,
      clearAll,
      searchTerm,
      setDebouncedSearchTerm,
      pageIndex,
      pageSize,
      setPageIndexWrapper,
      setPageSizeAndGoToFirstPage,
    ]
  );

  return <DataTableFiltersContext.Provider value={value}>{children}</DataTableFiltersContext.Provider>;
}

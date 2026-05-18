"use client";

import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ColumnFilter, FilterValue, SortingState } from "./lib/types";

interface DataTableContextValue {
  timeZone: string;
  columnFilters: ColumnFilter[];
  sorting: SortingState;
  limit: number;
  offset: number;
  ctaContainerRef: React.RefObject<HTMLDivElement>;
  updateFilter: (id: string, value: FilterValue) => void;
  removeFilter: (id: string) => void;
  setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFilter[]>>;
}

const DataTableContext = createContext<DataTableContextValue | null>(null);

export function useDataTableContext() {
  const ctx = useContext(DataTableContext);
  if (!ctx) throw new Error("useDataTableContext must be used within DataTableProvider");
  return ctx;
}

interface DataTableProviderProps {
  children: React.ReactNode;
  tableIdentifier?: string;
  timeZone?: string;
  useSegments?: () => unknown;
}

export function DataTableProvider({ children, timeZone: tz }: DataTableProviderProps) {
  const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([]);
  const [sorting] = useState<SortingState>([]);
  const ctaContainerRef = useRef<HTMLDivElement>(null);

  const updateFilter = useCallback((id: string, value: FilterValue) => {
    setColumnFilters((prev) => {
      const nextFilter = { id, value };
      const existingIndex = prev.findIndex((filter) => filter.id === id);
      if (existingIndex === -1) return [...prev, nextFilter];

      const next = [...prev];
      next[existingIndex] = nextFilter;
      return next;
    });
  }, []);

  const removeFilter = useCallback((id: string) => {
    setColumnFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return (
    <DataTableContext.Provider
      value={{
        timeZone: tz ?? CURRENT_TIMEZONE,
        columnFilters,
        sorting,
        limit: 100,
        offset: 0,
        ctaContainerRef,
        updateFilter,
        removeFilter,
        setColumnFilters,
      }}>
      {children}
    </DataTableContext.Provider>
  );
}

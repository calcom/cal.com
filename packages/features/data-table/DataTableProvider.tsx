"use client";

import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import { createContext, useCallback, useContext, useState } from "react";
import type { ColumnFilter } from "./lib/types";

interface DataTableContextValue {
  timeZone: string;
  columnFilters: ColumnFilter[];
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

  const removeFilter = useCallback((id: string) => {
    setColumnFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return (
    <DataTableContext.Provider
      value={{
        timeZone: tz ?? CURRENT_TIMEZONE,
        columnFilters,
        removeFilter,
        setColumnFilters,
      }}>
      {children}
    </DataTableContext.Provider>
  );
}

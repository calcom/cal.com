import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import type { FilterValue } from "../lib/types";

const STORAGE_KEY = "cal_shared_filters";

interface SharedFilters {
  [key: string]: {
    activeFilters: { f: string; v: FilterValue }[] | null;
    sorting: { id: string; desc: boolean }[] | null;
    columnVisibility: Record<string, boolean> | null;
    columnSizing: Record<string, number> | null;
    pageSize: number | null;
    searchTerm: string | null;
  };
}

export function useSharedFilters(tableIdentifier: string) {
  const pathname = usePathname();
  const [sharedFilters, setSharedFilters] = useState<SharedFilters>({});

  // Load filters from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSharedFilters(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored filters:", e);
      }
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sharedFilters));
  }, [sharedFilters]);

  const getFilters = useCallback(() => {
    return sharedFilters[tableIdentifier] || {
      activeFilters: null,
      sorting: null,
      columnVisibility: null,
      columnSizing: null,
      pageSize: null,
      searchTerm: null,
    };
  }, [sharedFilters, tableIdentifier]);

  const setFilters = useCallback(
    (filters: Partial<SharedFilters[string]>) => {
      setSharedFilters((prev) => ({
        ...prev,
        [tableIdentifier]: {
          ...prev[tableIdentifier],
          ...filters,
        },
      }));
    },
    [tableIdentifier]
  );

  return {
    getFilters,
    setFilters,
  };
} 
"use client";

import { type Table } from "@tanstack/react-table";
import { useMemo } from "react";

import { useDataTable } from "../../hooks";
import { ActiveFilters } from "./ActiveFilters";
import { AddFilterButton } from "./AddFilterButton";

interface FilterBarProps<TData> {
  table: Table<TData>;
  columnIdsToHide?: string[];
}

export function FilterBar<TData>({ table, columnIdsToHide }: FilterBarProps<TData>) {
  const { activeFilters } = useDataTable();
  const displayedFilterCount = useMemo(() => {
    return (activeFilters ?? []).filter((filter) =>
      columnIdsToHide ? !columnIdsToHide.includes(filter.f) : true
    ).length;
  }, [activeFilters, columnIdsToHide]);

  return (
    <>
      {displayedFilterCount === 0 && <AddFilterButton table={table} />}
      <ActiveFilters table={table} columnIdsToHide={columnIdsToHide} />
      {displayedFilterCount > 0 && <AddFilterButton table={table} variant="sm" />}
    </>
  );
}

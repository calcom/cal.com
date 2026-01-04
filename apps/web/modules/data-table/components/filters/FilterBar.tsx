"use client";

import { type Table } from "@tanstack/react-table";

import { useDisplayedFilterCount } from "../../hooks";
import { ActiveFilters } from "./ActiveFilters";
import { AddFilterButton } from "./AddFilterButton";

interface FilterBarProps<TData> {
  table: Table<TData>;
  columnIdsToHide?: string[];
}

export function FilterBar<TData>({ table, columnIdsToHide }: FilterBarProps<TData>) {
  const displayedFilterCount = useDisplayedFilterCount({ columnIdsToHide });

  return (
    <>
      {displayedFilterCount === 0 && <AddFilterButton table={table} />}
      <ActiveFilters table={table} columnIdsToHide={columnIdsToHide} />
      {displayedFilterCount > 0 && <AddFilterButton table={table} variant="minimal" />}
    </>
  );
}

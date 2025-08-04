import { type Table } from "@tanstack/react-table";

import { ActiveFilters } from "./ActiveFilters";

interface FilterBarProps<TData> {
  table: Table<TData>;
}

export function FilterBar<TData>({ table }: FilterBarProps<TData>) {
  return (
    <>
      {/* <AddFilterButton table={table} hideWhenFilterApplied /> */}
      <ActiveFilters table={table} />
      {/* <AddFilterButton table={table} variant="sm" showWhenFilterApplied /> */}
    </>
  );
}

import { type Table } from "@tanstack/react-table";

import { ActiveFilters } from "./ActiveFilters";

interface FilterBarProps<TData> {
  table: Table<TData>;
}

export function FilterBar<TData>({ table }: FilterBarProps<TData>) {
  return (
      <ActiveFilters table={table} />
  );
}

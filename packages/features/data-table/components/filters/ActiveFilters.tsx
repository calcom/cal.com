"use client";

import { type Table } from "@tanstack/react-table";
// eslint-disable-next-line no-restricted-imports
import { Fragment } from "react";

import { useDataTable, useFilterableColumns } from "../../hooks";
import { FilterPopover } from "./FilterPopover";

// Add the new ActiveFilters component
interface ActiveFiltersProps<TData> {
  table: Table<TData>;
}

export function ActiveFilters<TData>({ table }: ActiveFiltersProps<TData>) {
  const { activeFilters } = useDataTable();
  const filterableColumns = useFilterableColumns(table);

  return (
    <>
      {activeFilters.map((filter) => {
        const column = filterableColumns.find((col) => col.id === filter.f);
        if (!column) return null;
        return <FilterPopover key={column.id} column={column} />;
      })}
    </>
  );
}

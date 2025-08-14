"use client";

import { type Table } from "@tanstack/react-table";
import { useEffect } from "react";
// eslint-disable-next-line no-restricted-imports
import { Fragment } from "react";

import { useDataTable, useFilterableColumns } from "../../hooks";
import { ColumnFilterType } from "../../lib/types";
import { DateRangeFilter } from "./DateRangeFilter";
import { FilterPopover } from "./FilterPopover";

// Add the new ActiveFilters component
interface ActiveFiltersProps<TData> {
  table: Table<TData>;
}

export function ActiveFilters<TData>({ table }: ActiveFiltersProps<TData>) {
  const { activeFilters, addFilter } = useDataTable();
  const filterableColumns = useFilterableColumns(table);

  useEffect(() => {
    console.log("Active filters:", activeFilters);
    filterableColumns.forEach((column) => {
      addFilter(column.id);
    });
  }, [filterableColumns, activeFilters, addFilter]); // Empty dependency array means this runs once on mount

  return (
    <>
      {activeFilters.map((filter) => {
        const column = filterableColumns.find((col) => col.id === filter.f);
        if (!column) return null;

        if (column.type === ColumnFilterType.DATE_RANGE) {
          return (
            <DateRangeFilter
              key={column.id}
              column={column}
              options={column.dateRangeOptions}
              showColumnName={false}
              showClearButton
            />
          );
        } else {
          return <FilterPopover key={column.id} column={column} />;
        }
      })}
    </>
  );
}

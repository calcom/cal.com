"use client";

import type { Table } from "@tanstack/react-table";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  totalDbDataCount: number;
}

export function DataTablePagination<TData>({ table, totalDbDataCount }: DataTablePaginationProps<TData>) {
  const loadedCount = table.getFilteredRowModel().rows.length;

  return (
    <p className="text-subtle text-sm tabular-nums">
      Loaded <span className="text-default font-medium">{`${loadedCount}`}</span> of
      <span className="text-default font-medium"> {`${totalDbDataCount}`}</span>
    </p>
  );
}

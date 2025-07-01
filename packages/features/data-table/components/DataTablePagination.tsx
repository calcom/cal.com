"use client";

import { type Table } from "@tanstack/react-table";

import { Pagination } from "@calcom/ui/components/pagination";

import { useDataTable } from "../hooks";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  totalRowCount?: number;
  paginationMode?: "infinite" | "standard";
}

export function DataTablePagination<TData>({
  table,
  totalRowCount,
  paginationMode = "infinite",
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize, setPageIndex, setPageSize } = useDataTable();
  if (!totalRowCount) {
    return null;
  }

  if (paginationMode === "infinite") {
    const loadedCount = table.getRowModel().rows.length;
    return (
      <p className="text-subtle text-sm tabular-nums">
        Loaded <span className="text-default font-medium">{loadedCount}</span> of{" "}
        <span className="text-default font-medium">{totalRowCount}</span>
      </p>
    );
  } else if (paginationMode === "standard") {
    return (
      <Pagination
        currentPage={pageIndex + 1}
        pageSize={pageSize}
        totalItems={totalRowCount}
        onPageSizeChange={(newSize) => setPageSize(newSize)}
        onPageChange={(page) => setPageIndex(page - 1)}
      />
    );
  } else {
    return null;
  }
}

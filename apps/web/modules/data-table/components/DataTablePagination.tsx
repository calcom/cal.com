"use client";

import { type Table } from "@tanstack/react-table";

import { Pagination } from "@calcom/ui/components/pagination";

import { useDataTable } from "~/data-table/hooks";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  totalRowCount?: number;
  hasNextPage?: boolean;
  paginationMode?: "infinite" | "standard";
}

export function DataTablePagination<TData>({
  table,
  totalRowCount,
  hasNextPage,
  paginationMode = "infinite",
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize, setPageIndex, setPageSize } = useDataTable();

  if (paginationMode === "infinite") {
    if (!totalRowCount) return null;
    const loadedCount = table.getRowModel().rows.length;
    return (
      <p className="text-subtle text-sm tabular-nums">
        Loaded <span className="text-default font-medium">{loadedCount}</span> of{" "}
        <span className="text-default font-medium">{totalRowCount}</span>
      </p>
    );
  } else if (paginationMode === "standard") {
    if (!totalRowCount && !hasNextPage && pageIndex === 0) {
      return null;
    }
    return (
      <Pagination
        currentPage={pageIndex + 1}
        pageSize={pageSize}
        totalItems={totalRowCount}
        hasNextPage={hasNextPage}
        onPageSizeChange={(newSize) => setPageSize(newSize)}
        onPageChange={(page) => setPageIndex(page - 1)}
      />
    );
  } else {
    return null;
  }
}

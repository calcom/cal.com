"use client";

import type { Table as ReactTableType } from "@tanstack/react-table";
import { useRef } from "react";

import {
  DataTable,
  DataTableToolbar,
  DataTablePagination,
  useFetchMoreOnBottomReached,
} from "@calcom/features/data-table";

export type DataTableWrapperProps<TData, TValue> = {
  testId?: string;
  table: ReactTableType<TData>;
  isPending: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetching: boolean;
  totalDBRowCount?: number;
  ToolbarLeft?: React.ReactNode;
  ToolbarRight?: React.ReactNode;
  children: React.ReactNode;
};

export function DataTableWrapper<TData, TValue>({
  testId,
  table,
  isPending,
  hasNextPage,
  fetchNextPage,
  isFetching,
  totalDBRowCount,
  ToolbarLeft,
  ToolbarRight,
  children,
}: DataTableWrapperProps<TData, TValue>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const fetchMoreOnBottomReached = useFetchMoreOnBottomReached({
    tableContainerRef,
    hasNextPage,
    fetchNextPage,
    isFetching,
  });

  return (
    <DataTable
      data-testid={testId}
      table={table}
      tableContainerRef={tableContainerRef}
      isPending={isPending}
      enableColumnResizing={true}
      onScroll={(e) => fetchMoreOnBottomReached(e.target as HTMLDivElement)}>
      <DataTableToolbar.Root>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex items-center justify-start gap-2">{ToolbarLeft}</div>
            <div className="grow" />
            <div className="flex justify-end gap-2">{ToolbarRight}</div>
          </div>
        </div>

        {children}
      </DataTableToolbar.Root>

      {totalDBRowCount && (
        <div style={{ gridArea: "footer", marginTop: "1rem" }}>
          <DataTablePagination table={table} totalDbDataCount={totalDBRowCount} />
        </div>
      )}
    </DataTable>
  );
}

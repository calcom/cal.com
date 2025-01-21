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
  bodyTestId?: string;
  table: ReactTableType<TData>;
  isPending: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetching: boolean;
  hideHeader?: boolean;
  variant?: "default" | "compact";
  totalDBRowCount?: number;
  ToolbarLeft?: React.ReactNode;
  ToolbarRight?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  children?: React.ReactNode;
};

export function DataTableWrapper<TData, TValue>({
  testId,
  bodyTestId,
  table,
  isPending,
  hasNextPage,
  fetchNextPage,
  isFetching,
  totalDBRowCount,
  variant,
  hideHeader,
  ToolbarLeft,
  ToolbarRight,
  className,
  containerClassName,
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
      testId={testId}
      bodyTestId={bodyTestId}
      table={table}
      tableContainerRef={tableContainerRef}
      isPending={isPending}
      enableColumnResizing={true}
      hideHeader={hideHeader}
      variant={variant}
      className={className}
      containerClassName={containerClassName}
      onScroll={(e) => fetchMoreOnBottomReached(e.target as HTMLDivElement)}>
      {(ToolbarLeft || ToolbarRight) && (
        <DataTableToolbar.Root>
          <div className="flex w-full flex-col gap-2">
            <div className="flex w-full flex-wrap justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">{ToolbarLeft}</div>
              <div className="flex flex-wrap items-center gap-2">{ToolbarRight}</div>
            </div>
          </div>

          {children}
        </DataTableToolbar.Root>
      )}

      {totalDBRowCount && (
        <div style={{ gridArea: "footer", marginTop: "1rem" }}>
          <DataTablePagination table={table} totalDbDataCount={totalDBRowCount} />
        </div>
      )}
    </DataTable>
  );
}

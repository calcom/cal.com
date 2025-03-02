"use client";

import type { Table as ReactTableType, VisibilityState } from "@tanstack/react-table";
import { useEffect, useRef } from "react";

import {
  DataTable,
  DataTablePagination,
  useFetchMoreOnBottomReached,
  useDataTable,
  useColumnFilters,
} from "@calcom/features/data-table";
import { classNames } from "@calcom/lib";

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
  EmptyView?: React.ReactNode;
  LoaderView?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  children?: React.ReactNode;
  tableContainerRef?: React.RefObject<HTMLDivElement>;
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
  EmptyView,
  LoaderView,
  className,
  containerClassName,
  children,
  tableContainerRef: externalRef,
}: DataTableWrapperProps<TData, TValue>) {
  const internalRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = externalRef || internalRef;
  const fetchMoreOnBottomReached = useFetchMoreOnBottomReached({
    tableContainerRef,
    hasNextPage,
    fetchNextPage,
    isFetching,
  });
  const { sorting, setSorting, columnVisibility, setColumnVisibility } = useDataTable();
  const columnFilters = useColumnFilters();

  useEffect(() => {
    const mergedColumnVisibility = {
      ...(table.initialState?.columnVisibility || {}),
      ...columnVisibility,
    } satisfies VisibilityState;

    table.setState((prev) => ({
      ...prev,
      sorting,
      columnFilters,
      columnVisibility: mergedColumnVisibility,
    }));
    table.setOptions((prev) => ({
      ...prev,
      onSortingChange: setSorting,
      onColumnVisibilityChange: setColumnVisibility,
    }));
  }, [table, sorting, columnFilters, columnVisibility]);

  let view: "loader" | "empty" | "table" = "table";
  if (isPending && LoaderView) {
    view = "loader";
  } else if (table.getRowCount() === 0 && EmptyView) {
    view = "empty";
  }

  return (
    <>
      {(ToolbarLeft || ToolbarRight || children) && (
        <div className={classNames("grid w-full items-center gap-2 py-4", className)}>
          <div className="flex w-full flex-col gap-2">
            <div className="flex w-full flex-wrap justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">{ToolbarLeft}</div>
              <div className="flex flex-wrap items-center gap-2">{ToolbarRight}</div>
            </div>
          </div>

          {children}
        </div>
      )}
      {view === "loader" && LoaderView}
      {view === "empty" && EmptyView}
      {view === "table" && (
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
          {totalDBRowCount && (
            <div style={{ gridArea: "footer", marginTop: "1rem" }}>
              <DataTablePagination table={table} totalDbDataCount={totalDBRowCount} />
            </div>
          )}
        </DataTable>
      )}
    </>
  );
}

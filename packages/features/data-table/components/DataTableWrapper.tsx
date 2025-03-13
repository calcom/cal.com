"use client";

import type { Table as ReactTableType, VisibilityState } from "@tanstack/react-table";
// eslint-disable-next-line no-restricted-imports
import { noop } from "lodash";
import { useEffect, useRef } from "react";

import {
  DataTable,
  DataTablePagination,
  useFetchMoreOnBottomReached,
  useDataTable,
  useColumnFilters,
} from "@calcom/features/data-table";
import classNames from "@calcom/ui/classNames";

type BaseDataTableWrapperProps<TData> = {
  testId?: string;
  bodyTestId?: string;
  table: ReactTableType<TData>;
  isPending: boolean;
  hideHeader?: boolean;
  variant?: "default" | "compact";
  totalRowCount?: number;
  ToolbarLeft?: React.ReactNode;
  ToolbarRight?: React.ReactNode;
  EmptyView?: React.ReactNode;
  LoaderView?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  children?: React.ReactNode;
  tableContainerRef?: React.RefObject<HTMLDivElement>;
};

type InfinitePaginationProps<TData> = BaseDataTableWrapperProps<TData> & {
  paginationMode: "infinite";
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetching: boolean;
};

type StandardPaginationProps<TData> = BaseDataTableWrapperProps<TData> & {
  paginationMode: "standard";
  hasNextPage?: never;
  fetchNextPage?: never;
  isFetching?: never;
};

export type DataTableWrapperProps<TData> = InfinitePaginationProps<TData> | StandardPaginationProps<TData>;

export function DataTableWrapper<TData>({
  testId,
  bodyTestId,
  table,
  isPending,
  hasNextPage,
  fetchNextPage,
  isFetching,
  totalRowCount,
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
  paginationMode,
}: DataTableWrapperProps<TData>) {
  const internalRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = externalRef || internalRef;
  const fetchMoreOnBottomReached = useFetchMoreOnBottomReached({
    tableContainerRef,
    hasNextPage: paginationMode === "infinite" ? hasNextPage : false,
    fetchNextPage: paginationMode === "infinite" ? fetchNextPage : noop,
    isFetching: paginationMode === "infinite" ? isFetching : false,
    enabled: paginationMode === "infinite",
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
  }, [table, sorting, columnFilters, columnVisibility, setSorting, setColumnVisibility]);

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
          paginationMode={paginationMode}
          onScroll={
            paginationMode === "infinite"
              ? (e: Pick<React.UIEvent<HTMLDivElement, UIEvent>, "target">) =>
                  fetchMoreOnBottomReached(e.target as HTMLDivElement)
              : undefined
          }>
          {totalRowCount && (
            <div style={{ gridArea: "footer", marginTop: "1rem" }}>
              <DataTablePagination<TData>
                table={table}
                totalRowCount={totalRowCount}
                paginationMode={paginationMode}
              />
            </div>
          )}
        </DataTable>
      )}
    </>
  );
}

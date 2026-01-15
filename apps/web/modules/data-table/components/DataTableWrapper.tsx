"use client";

import type { Row, VisibilityState } from "@tanstack/react-table";
import { noop } from "lodash";
import { useEffect, useRef } from "react";

import { useColumnFilters } from "@calcom/features/data-table/hooks/useColumnFilters";
import { useDataTable } from "@calcom/features/data-table/hooks/useDataTable";
import { useFetchMoreOnBottomReached } from "@calcom/features/data-table/hooks/useFetchMoreOnBottomReached";
import type { DataTablePropsFromWrapper } from "./DataTable";
import { DataTable } from "./DataTable";
import { DataTablePagination } from "./DataTablePagination";

type BaseDataTableWrapperProps<TData> = Omit<
  DataTablePropsFromWrapper<TData>,
  "paginationMode" | "tableContainerRef"
> & {
  totalRowCount?: number;
  ToolbarLeft?: React.ReactNode;
  ToolbarRight?: React.ReactNode;
  EmptyView?: React.ReactNode;
  LoaderView?: React.ReactNode;
  ErrorView?: React.ReactNode;
  hasError?: boolean;
  tableContainerRef?: React.RefObject<HTMLDivElement>;
  onRowMouseclick?: (row: Row<TData>) => void;
  rowTestId?: string | ((row: Row<TData>) => string | undefined);
  rowDataAttributes?: (row: Row<TData>) => Record<string, string> | undefined;
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
  ToolbarLeft,
  ToolbarRight,
  EmptyView,
  LoaderView,
  ErrorView,
  hasError,
  className,
  containerClassName,
  headerClassName,
  rowClassName,
  rowTestId,
  rowDataAttributes,
  children,
  tableContainerRef: externalRef,
  paginationMode,
  onRowMouseclick,
  hideSeparatorsOnSort,
  hideSeparatorsOnFilter,
  separatorClassName,
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
      ...table.initialState?.columnVisibility,
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

  // Scroll to top when table data changes
  useScrollToTopOnDataChange({
    tableData: table.options.data,
    paginationMode,
  });

  let view: "loader" | "empty" | "error" | "table" = "table";
  if (hasError && ErrorView) {
    view = "error";
  } else if (isPending && LoaderView) {
    view = "loader";
  } else if (table.getRowCount() === 0 && EmptyView) {
    view = "empty";
  }

  return (
    <>
      {(ToolbarLeft || ToolbarRight || children) && (
        <div className="grid w-full items-center gap-2 pb-4">
          <div className="flex w-full flex-col gap-2">
            <div className="flex w-full flex-wrap justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">{ToolbarLeft}</div>
              <div className="flex flex-wrap items-center gap-2">{ToolbarRight}</div>
            </div>
          </div>

          {children}
        </div>
      )}
      {view === "error" && ErrorView}
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
          variant={variant}
          className={className}
          containerClassName={containerClassName}
          headerClassName={headerClassName}
          rowClassName={rowClassName}
          rowTestId={rowTestId}
          rowDataAttributes={rowDataAttributes}
          paginationMode={paginationMode}
          onRowMouseclick={onRowMouseclick}
          hasWrapperContext={true}
          hideSeparatorsOnSort={hideSeparatorsOnSort}
          hideSeparatorsOnFilter={hideSeparatorsOnFilter}
          separatorClassName={separatorClassName}
          onScroll={
            paginationMode === "infinite"
              ? (e: Pick<React.UIEvent<HTMLDivElement, UIEvent>, "target">) =>
                  fetchMoreOnBottomReached(e.target as HTMLDivElement)
              : undefined
          }>
          <div style={{ gridArea: "footer" }} className="px-3 py-2">
            <DataTablePagination<TData>
              table={table}
              totalRowCount={totalRowCount}
              paginationMode={paginationMode}
            />
          </div>
        </DataTable>
      )}
    </>
  );
}

/**
 * Scrolls to top when table data changes (pagination, filters, etc.)
 * Only active for standard pagination mode where we show discrete pages
 */
function useScrollToTopOnDataChange<TData>({
  tableData,
  paginationMode,
}: {
  tableData: TData[];
  paginationMode: "standard" | "infinite";
}) {
  const previousDataRef = useRef(tableData);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const hasDataChanged = previousDataRef.current !== tableData;
    previousDataRef.current = tableData;

    if (paginationMode === "standard" && hasDataChanged) {
      window.scrollTo(0, 0);
    }
  }, [tableData, paginationMode]);
}

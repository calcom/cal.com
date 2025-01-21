"use client";

import type { Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type { Table as ReactTableType } from "@tanstack/react-table";
import { useVirtualizer, type Virtualizer } from "@tanstack/react-virtual";
// eslint-disable-next-line no-restricted-imports
import kebabCase from "lodash/kebabCase";
import { usePathname } from "next/navigation";
import { useEffect, memo } from "react";

import classNames from "@calcom/lib/classNames";
import { Icon } from "@calcom/ui";

import { useColumnSizingVars } from "../hooks";
import { usePersistentColumnResizing } from "../lib/resizing";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./Table";

const getPinningStyles = (column: Column<Item>, isHeader: boolean): CSSProperties => {
  const isPinned = column.getIsPinned();
  let zIndex = 0;
  if (isHeader && isPinned) {
    zIndex = 20;
  } else if (isHeader && !isPinned) {
    zIndex = 10;
  } else if (!isHeader && isPinned) {
    zIndex = 1;
  } else {
    zIndex = 0;
  }

  return {
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    position: isPinned ? "sticky" : "relative",
    width: column.getSize(),
    zIndex,
  };
};

export type DataTableProps<TData, TValue> = {
  table: ReactTableType<TData>;
  tableContainerRef: React.RefObject<HTMLDivElement>;
  isPending?: boolean;
  onRowMouseclick?: (row: Row<TData>) => void;
  onScroll?: (e: Pick<React.UIEvent<HTMLDivElement, UIEvent>, "target">) => void;
  tableOverlay?: React.ReactNode;
  variant?: "default" | "compact";
  testId?: string;
  bodyTestId?: string;
  hideHeader?: boolean;
  children?: React.ReactNode;
  identifier?: string;
  enableColumnResizing?: boolean;
  className?: string;
  containerClassName?: string;
};

export function DataTable<TData, TValue>({
  table,
  tableContainerRef,
  isPending,
  variant,
  onRowMouseclick,
  onScroll,
  children,
  hideHeader,
  identifier: _identifier,
  enableColumnResizing,
  testId,
  bodyTestId,
  className,
  containerClassName,
  ...rest
}: DataTableProps<TData, TValue> & React.ComponentPropsWithoutRef<"div">) {
  const pathname = usePathname() as string | null;
  const identifier = _identifier ?? pathname ?? undefined;

  const { rows } = table.getRowModel();

  // https://stackblitz.com/github/tanstack/table/tree/main/examples/react/virtualized-infinite-scrolling
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 100,
    getScrollElement: () => tableContainerRef.current,
    // measure dynamic row height, except in firefox because it measures table border height incorrectly
    measureElement:
      typeof window !== "undefined" && navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 10,
  });

  useEffect(() => {
    if (rowVirtualizer.getVirtualItems().length >= rows.length && tableContainerRef.current) {
      const target = tableContainerRef.current;
      // Right after the last row is rendered, tableContainer's scrollHeight is
      // temporarily larger than the actual height of the table, so we need to
      // wait for a short time before calling onScroll to ensure the scrollHeight
      // is correct.
      setTimeout(() => {
        onScroll?.({ target });
      }, 100);
    }
  }, [rowVirtualizer.getVirtualItems().length, rows.length, tableContainerRef.current]);

  const columnSizingVars = useColumnSizingVars({ table });

  usePersistentColumnResizing({
    enabled: Boolean(enableColumnResizing && identifier),
    table,
    tableContainerRef,
    identifier,
  });

  return (
    <div
      className={classNames("grid", className)}
      style={{
        gridTemplateRows: "auto 1fr auto",
        gridTemplateAreas: "'header' 'body' 'footer'",
        ...rest.style,
      }}
      data-testid={testId ?? "data-table"}>
      <div
        ref={tableContainerRef}
        onScroll={onScroll}
        className={classNames(
          "relative w-full",
          "scrollbar-thin h-[80dvh] overflow-auto", // Set a fixed height for the container
          "bg-background border-subtle rounded-lg border",
          containerClassName
        )}
        style={{ gridArea: "body" }}>
        <Table
          className={classNames(
            "[&_td]:border-subtle [&_th]:border-subtle border-separate border-spacing-0 [&_tfoot_td]:border-t [&_th]:border-b [&_tr:not(:last-child)_td]:border-b [&_tr]:border-none",
            Boolean(enableColumnResizing) && "table-fixed"
          )}
          style={{
            ...columnSizingVars,
            ...(Boolean(enableColumnResizing) && { width: table.getCenterTotalSize() }),
          }}>
          {!hideHeader && (
            <TableHeader className="sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta;
                    const { column } = header;
                    const isPinned = column.getIsPinned();
                    const isLastLeftPinned = isPinned === "left" && column.getIsLastColumn("left");
                    const isFirstRightPinned = isPinned === "right" && column.getIsFirstColumn("right");

                    return (
                      <TableHead
                        key={header.id}
                        className="bg-muted relative h-10 select-none [&>.cursor-col-resize]:last:opacity-0"
                        aria-sort={
                          header.column.getIsSorted() === "asc"
                            ? "ascending"
                            : header.column.getIsSorted() === "desc"
                            ? "descending"
                            : "none"
                        }
                        data-pinned={isPinned || undefined}
                        data-last-col={isLastLeftPinned ? "left" : isFirstRightPinned ? "right" : undefined}
                        style={{
                          ...getPinningStyles(column, true),
                          width: `var(--header-${kebabCase(header?.id)}-size)`,
                        }}>
                        <div>
                          {header.isPlaceholder ? null : (
                            <div
                              className={classNames(
                                header.column.getCanSort() &&
                                  "flex h-full cursor-pointer select-none items-center justify-between gap-2"
                              )}
                              onClick={header.column.getToggleSortingHandler()}
                              onKeyDown={(e) => {
                                // Enhanced keyboard handling for sorting
                                if (header.column.getCanSort() && (e.key === "Enter" || e.key === " ")) {
                                  e.preventDefault();
                                  header.column.getToggleSortingHandler()?.(e);
                                }
                              }}
                              tabIndex={header.column.getCanSort() ? 0 : undefined}>
                              <span className="truncate">
                                {flexRender(header.column.columnDef.header, header.getContext())}
                              </span>
                              {{
                                asc: (
                                  <Icon
                                    name="chevron-up"
                                    size={16}
                                    className="mr-2 shrink-0 opacity-60"
                                    strokeWidth={2}
                                    aria-hidden="true"
                                  />
                                ),
                                desc: (
                                  <Icon
                                    name="chevron-down"
                                    size={16}
                                    className="mr-2 shrink-0 opacity-60"
                                    strokeWidth={2}
                                    aria-hidden="true"
                                  />
                                ),
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>
                          )}
                          {Boolean(enableColumnResizing) && header.column.getCanResize() && (
                            <div
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className={classNames(
                                "group absolute right-0 top-0 h-full cursor-col-resize touch-none select-none px-2"
                              )}>
                              <div className="bg-subtle group-hover:bg-inverted h-full w-[1px]" />
                            </div>
                          )}
                        </div>
                        {Boolean(enableColumnResizing) && header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={classNames(header.column.getIsResizing() && "!opacity-75")}
                          />
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
          )}
          {/* When resizing any column we will render this special memoized version of our table body */}
          {table.getState().columnSizingInfo.isResizingColumn ? (
            <MemoizedTableBody
              table={table}
              rowVirtualizer={rowVirtualizer}
              rows={rows}
              testId={bodyTestId}
              variant={variant}
              isPending={isPending}
              onRowMouseclick={onRowMouseclick}
            />
          ) : (
            <DataTableBody
              table={table}
              rowVirtualizer={rowVirtualizer}
              rows={rows}
              testId={bodyTestId}
              variant={variant}
              isPending={isPending}
              onRowMouseclick={onRowMouseclick}
            />
          )}
        </Table>
      </div>
      {children}
    </div>
  );
}

const MemoizedTableBody = memo(
  DataTableBody,
  (prev, next) =>
    prev.table.options.data === next.table.options.data &&
    prev.rowVirtualizer === next.rowVirtualizer &&
    prev.rows === next.rows &&
    prev.testId === next.testId &&
    prev.variant === next.variant &&
    prev.isPending === next.isPending &&
    prev.onRowMouseclick === next.onRowMouseclick
) as typeof DataTableBody;

type DataTableBodyProps<TData> = {
  table: ReactTableType<TData>;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  rows: Row<TData>[];
  testId?: string;
  variant?: "default" | "compact";
  isPending?: boolean;
  onRowMouseclick?: (row: Row<TData>) => void;
};

function DataTableBody<TData>({
  table,
  rowVirtualizer,
  rows,
  testId,
  variant,
  isPending,
  onRowMouseclick,
}: DataTableBodyProps<TData>) {
  const virtualRows = rowVirtualizer.getVirtualItems();
  return (
    <TableBody data-testid={testId} style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
      {virtualRows && !isPending ? (
        virtualRows.map((virtualRow) => {
          const row = rows[virtualRow.index] as Row<TData>;
          return (
            <TableRow
              ref={(node) => rowVirtualizer.measureElement(node)} //measure dynamic row height
              key={row.id}
              data-index={virtualRow.index} //needed for dynamic row height measurement
              data-state={row.getIsSelected() && "selected"}
              style={{
                display: "flex",
                position: "absolute",
                transform: `translateY(${virtualRow.start}px)`, //this should always be a `style` as it changes on scroll
                width: "100%",
              }}
              className={classNames(
                onRowMouseclick && "hover:cursor-pointer",
                "has-[[data-state=selected]]:bg-muted/50 group"
              )}
              onClick={() => onRowMouseclick && onRowMouseclick(row)}>
              {row.getVisibleCells().map((cell) => {
                const column = table.getColumn(cell.column.id);
                const meta = column?.columnDef.meta;
                const isPinned = column.getIsPinned();
                const isLastLeftPinned = isPinned === "left" && column.getIsLastColumn("left");
                const isFirstRightPinned = isPinned === "right" && column.getIsFirstColumn("right");

                return (
                  <TableCell
                    key={cell.id}
                    className="[&[data-pinned]]:bg-default truncate [&[data-pinned]]:backdrop-blur-sm"
                    data-pinned={isPinned || undefined}
                    data-last-col={isLastLeftPinned ? "left" : isFirstRightPinned ? "right" : undefined}
                    style={{
                      ...getPinningStyles(column, false),
                      width: `var(--col-${kebabCase(cell.column.id)}-size)`,
                    }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })
      ) : (
        <TableRow>
          <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
            No results.
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  );
}

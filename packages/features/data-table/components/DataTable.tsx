"use client";

import type { Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type { Table as ReactTableType } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useEffect } from "react";

import classNames from "@calcom/lib/classNames";
import { Icon, TableNew, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@calcom/ui";

export interface DataTableProps<TData, TValue> {
  table: ReactTableType<TData>;
  tableContainerRef: React.RefObject<HTMLDivElement>;
  isPending?: boolean;
  onRowMouseclick?: (row: Row<TData>) => void;
  onScroll?: (e: Pick<React.UIEvent<HTMLDivElement, UIEvent>, "target">) => void;
  tableOverlay?: React.ReactNode;
  variant?: "default" | "compact";
  "data-testid"?: string;
  children?: React.ReactNode;
}
export function DataTable<TData, TValue>({
  table,
  tableContainerRef,
  isPending,
  variant,
  onRowMouseclick,
  onScroll,
  children,
  ...rest
}: DataTableProps<TData, TValue> & React.ComponentPropsWithoutRef<"div">) {
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

  const virtualRows = rowVirtualizer.getVirtualItems();

  const columnSizeVars = useMemo(() => {
    const headers = table.getFlatHeaders();
    const colSizes: { [key: string]: number } = {};
    for (let i = 0; i < headers.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const header = headers[i]!;
      colSizes[`--header-${header.id}-size`] = header.getSize();
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
    }
    return colSizes;
  }, [table.getFlatHeaders(), table.getState().columnSizingInfo, table.getState().columnSizing]);

  return (
    <div
      className={classNames("grid", rest.className)}
      style={{
        gridTemplateRows: "auto 1fr auto",
        gridTemplateAreas: "'header' 'body' 'footer'",
        ...rest.style,
        ...columnSizeVars,
      }}
      data-testid={rest["data-testid"] ?? "data-table"}>
      <div
        ref={tableContainerRef}
        onScroll={onScroll}
        className={classNames(
          "relative h-[80dvh] overflow-auto", // Set a fixed height for the container
          "scrollbar-thin border-subtle relative rounded-md border"
        )}
        style={{ gridArea: "body" }}>
        <TableNew className="grid border-0">
          <TableHeader className="bg-subtle sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="flex w-full">
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        ...(meta?.sticky?.position === "left" && { left: `${meta.sticky.gap || 0}px` }),
                        ...(meta?.sticky?.position === "right" && { right: `${meta.sticky.gap || 0}px` }),
                        width: `calc(var(--header-${header?.id}-size) * 1px)`,
                      }}
                      className={classNames(
                        "flex shrink-0 items-center",
                        header.column.getCanSort() ? "cursor-pointer select-none" : "",
                        meta?.sticky && "bg-subtle sticky top-0 z-20"
                      )}>
                      <div className="flex items-center" onClick={header.column.getToggleSortingHandler()}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() && (
                          <Icon
                            name="arrow-up"
                            className="ml-2 h-4 w-4"
                            style={{
                              transform:
                                header.column.getIsSorted() === "asc" ? "rotate(0deg)" : "rotate(180deg)",
                              transition: "transform 0.2s ease-in-out",
                            }}
                          />
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="relative grid" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
            {virtualRows && !isPending ? (
              virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index] as Row<TData>;
                return (
                  <TableRow
                    ref={(node) => rowVirtualizer.measureElement(node)} //measure dynamic row height
                    key={row.id}
                    data-index={virtualRow.index} //needed for dynamic row height measurement
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => onRowMouseclick && onRowMouseclick(row)}
                    style={{
                      display: "flex",
                      position: "absolute",
                      transform: `translateY(${virtualRow.start}px)`, //this should always be a `style` as it changes on scroll
                      width: "100%",
                    }}
                    className={classNames(
                      onRowMouseclick && "hover:cursor-pointer",
                      variant === "compact" && "!border-0",
                      "group"
                    )}>
                    {row.getVisibleCells().map((cell) => {
                      const column = table.getColumn(cell.column.id);
                      const meta = column?.columnDef.meta;
                      return (
                        <TableCell
                          key={cell.id}
                          style={{
                            ...(meta?.sticky?.position === "left" && { left: `${meta.sticky.gap || 0}px` }),
                            ...(meta?.sticky?.position === "right" && { right: `${meta.sticky.gap || 0}px` }),
                            width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
                          }}
                          className={classNames(
                            "flex shrink-0 items-center overflow-hidden",
                            variant === "compact" && "p-1.5",
                            meta?.sticky && "group-hover:bg-muted bg-default sticky"
                          )}>
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
        </TableNew>
      </div>
      {children}
    </div>
  );
}

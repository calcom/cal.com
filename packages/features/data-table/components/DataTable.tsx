"use client";

import type { Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type { Table as ReactTableType, Header, HeaderGroup } from "@tanstack/react-table";
import { useVirtualizer, type Virtualizer, type VirtualItem } from "@tanstack/react-virtual";
// eslint-disable-next-line no-restricted-imports
import kebabCase from "lodash/kebabCase";
import { usePathname } from "next/navigation";
import { useEffect, useState, memo, useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  TableNew,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Command,
  CommandList,
  CommandItem,
  Icon,
} from "@calcom/ui";
import classNames from "@calcom/ui/classNames";

import { useColumnSizingVars } from "../hooks";
import { usePersistentColumnResizing } from "../lib/resizing";

export type DataTablePropsFromWrapper<TData> = {
  table: ReactTableType<TData>;
  tableContainerRef: React.RefObject<HTMLDivElement>;
  isPending?: boolean;
  variant?: "default" | "compact";
  testId?: string;
  bodyTestId?: string;
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  headerClassName?: string;
  rowClassName?: string;
  paginationMode?: "infinite" | "standard";
};

export type DataTableProps<TData> = DataTablePropsFromWrapper<TData> & {
  onRowMouseclick?: (row: Row<TData>) => void;
  onScroll?: (e: Pick<React.UIEvent<HTMLDivElement, UIEvent>, "target">) => void;
  tableOverlay?: React.ReactNode;
  identifier?: string;
  enableColumnResizing?: boolean;
};

export function DataTable<TData>({
  table,
  tableContainerRef,
  isPending,
  variant,
  onRowMouseclick,
  onScroll,
  children,
  identifier: _identifier,
  enableColumnResizing,
  testId,
  bodyTestId,
  className,
  containerClassName,
  headerClassName,
  rowClassName,
  paginationMode = "infinite",
  ...rest
}: DataTableProps<TData> & React.ComponentPropsWithoutRef<"div">) {
  const pathname = usePathname() as string | null;
  const identifier = _identifier ?? pathname ?? undefined;

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 100,
    getScrollElement: () => tableContainerRef.current,
    measureElement:
      typeof window !== "undefined" && navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 10,
  });

  const virtualItemsCount = rowVirtualizer.getVirtualItems().length;

  useEffect(() => {
    if (paginationMode === "infinite" && virtualItemsCount >= rows.length && tableContainerRef.current) {
      const target = tableContainerRef.current;
      // Right after the last row is rendered, tableContainer's scrollHeight is
      // temporarily larger than the actual height of the table, so we need to
      // wait for a short time before calling onScroll to ensure the scrollHeight
      // is correct.
      setTimeout(() => {
        onScroll?.({ target });
      }, 100);
    }
  }, [virtualItemsCount, rows.length, tableContainerRef.current, paginationMode, onScroll]);

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
      {/*
        Invalidate left & right properties for <= sm screen size,
        because we pin columns only for >= sm screen sizes.
      */}
      <style jsx global>{`
        @media (max-width: 640px) {
          .data-table th,
          .data-table td {
            left: initial !important;
            right: initial !important;
          }
        }
      `}</style>
      <div
        ref={tableContainerRef}
        onScroll={onScroll}
        className={classNames(
          "relative overflow-auto",
          "scrollbar-thin border-subtle relative rounded-md border",
          paginationMode === "infinite" && "h-[80dvh]", // Set a fixed height for the container
          containerClassName
        )}
        style={{ gridArea: "body" }}>
        <TableNew
          className="data-table grid border-0"
          style={{
            ...columnSizingVars,
            ...(Boolean(enableColumnResizing) && { width: table.getTotalSize() }),
          }}>
          <TableHeader className={classNames("sticky top-0 z-10", headerClassName)}>
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
              <TableRow key={headerGroup.id} className="hover:bg-subtle flex w-full">
                {headerGroup.headers.map((header: Header<TData, unknown>) => {
                  const { column } = header;
                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        ...(column.getIsPinned() === "left" && { left: `${column.getStart("left")}px` }),
                        ...(column.getIsPinned() === "right" && { right: `${column.getStart("right")}px` }),
                        width: `var(--header-${kebabCase(header?.id)}-size)`,
                      }}
                      className={classNames(
                        "relative flex shrink-0 items-center",
                        "bg-subtle",
                        column.getIsPinned() && "top-0 z-20 sm:sticky"
                      )}>
                      <TableHeadLabel header={header} />
                      {Boolean(enableColumnResizing) && header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={classNames(
                            "group absolute right-0 top-0 h-full w-[5px] cursor-col-resize touch-none select-none opacity-[0.1] hover:opacity-50",
                            header.column.getIsResizing() && "!opacity-75"
                          )}>
                          <div className="bg-inverted mx-auto h-full w-[1px]" />
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
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
              paginationMode={paginationMode}
              rowClassName={rowClassName}
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
              paginationMode={paginationMode}
              rowClassName={rowClassName}
            />
          )}
        </TableNew>
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
    prev.onRowMouseclick === next.onRowMouseclick &&
    prev.paginationMode === next.paginationMode &&
    prev.rowClassName === next.rowClassName
) as typeof DataTableBody;

type DataTableBodyProps<TData> = {
  table: ReactTableType<TData>;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  rows: Row<TData>[];
  testId?: string;
  variant?: "default" | "compact";
  isPending?: boolean;
  onRowMouseclick?: (row: Row<TData>) => void;
  paginationMode?: "infinite" | "standard";
  rowClassName?: string;
};

type RowToRender<TData> = {
  row: Row<TData>;
  virtualItem?: VirtualItem;
};

function DataTableBody<TData>({
  table,
  rowVirtualizer,
  rows,
  testId,
  variant,
  isPending,
  onRowMouseclick,
  paginationMode,
  rowClassName,
}: DataTableBodyProps<TData> & { paginationMode?: "infinite" | "standard" }) {
  const { t } = useLocale();
  const virtualItems = rowVirtualizer.getVirtualItems();
  const tableHeight = paginationMode === "infinite" ? rowVirtualizer.getTotalSize() : "auto";

  const rowsToRender = useMemo<RowToRender<TData>[]>(
    () =>
      paginationMode === "infinite"
        ? virtualItems.map((virtualItem) => ({
            row: rows[virtualItem.index] as Row<TData>,
            virtualItem,
          }))
        : rows.map((row) => ({ row })),
    [paginationMode, virtualItems, rows]
  );

  if (!isPending && rowsToRender.length === 0) {
    return (
      <TableBody className="relative grid" data-testid={testId} style={{ height: tableHeight }}>
        <TableRow>
          <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
            {t("no_results")}
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody className="relative grid" data-testid={testId} style={{ height: tableHeight }}>
      {rowsToRender.map(({ row, virtualItem }) => (
        <TableRow
          ref={virtualItem ? (node) => rowVirtualizer.measureElement(node) : undefined}
          key={row.id}
          data-index={virtualItem?.index} //needed for dynamic row height measurement
          data-state={row.getIsSelected() && "selected"}
          onClick={() => onRowMouseclick && onRowMouseclick(row)}
          style={{
            display: "flex",
            ...(virtualItem && {
              position: "absolute",
              transform: `translateY(${virtualItem.start}px)`,
              width: "100%",
            }),
          }}
          className={classNames(onRowMouseclick && "hover:cursor-pointer", "group", rowClassName)}>
          {row.getVisibleCells().map((cell) => {
            const column = cell.column;
            return (
              <TableCell
                key={cell.id}
                style={{
                  ...(column.getIsPinned() === "left" && { left: `${column.getStart("left")}px` }),
                  ...(column.getIsPinned() === "right" && { right: `${column.getStart("right")}px` }),
                  width: `var(--col-${kebabCase(cell.column.id)}-size)`,
                }}
                className={classNames(
                  "flex shrink-0 items-center overflow-hidden",
                  variant === "compact" && "p-0",
                  column.getIsPinned() &&
                    "bg-default group-hover:!bg-muted group-data-[state=selected]:bg-subtle sm:sticky"
                )}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </TableBody>
  );
}

const TableHeadLabel = ({ header }: { header: Header<any, any> }) => {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();

  const canHide = header.column.getCanHide();
  const canSort = header.column.getCanSort();

  if (!canSort && !canHide) {
    if (typeof header.column.columnDef.header === "string") {
      return (
        <div className="truncate px-2 py-1" title={header.column.columnDef.header}>
          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
        </div>
      );
    } else {
      return header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext());
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={classNames(
            "group mr-1 flex w-full items-center gap-2 rounded-md px-2 py-1",
            open && "bg-muted"
          )}>
          <div
            className="truncate"
            title={
              typeof header.column.columnDef.header === "string" ? header.column.columnDef.header : undefined
            }>
            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
          </div>
          {header.column.getIsSorted() === "asc" && <Icon name="arrow-up" className="h-4 w-4 shrink-0" />}
          {header.column.getIsSorted() === "desc" && <Icon name="arrow-down" className="h-4 w-4 shrink-0" />}
          <div className="grow" />
          <Icon
            name="chevrons-up-down"
            className={classNames(
              "text-subtle h-4 w-4 shrink-0",
              !open && "opacity-0 group-hover:opacity-100"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-32 p-0">
        <Command>
          <CommandList>
            {canSort && (
              <>
                <CommandItem
                  className="flex cursor-pointer items-center gap-2 px-3 py-2"
                  onSelect={() => {
                    if (header.column.getIsSorted() === "asc") {
                      header.column.clearSorting();
                    } else {
                      header.column.toggleSorting(false, true);
                    }
                  }}>
                  <Icon name="arrow-up" className="h-4 w-4" />
                  {t("asc")}
                  <div className="flex-1" />
                  {header.column.getIsSorted() === "asc" && <Icon name="check" className="h-4 w-4" />}
                </CommandItem>
                <CommandItem
                  className="flex cursor-pointer items-center gap-2 px-3 py-2"
                  onSelect={() => {
                    if (header.column.getIsSorted() === "desc") {
                      header.column.clearSorting();
                    } else {
                      header.column.toggleSorting(true, true);
                    }
                  }}>
                  <Icon name="arrow-down" className="h-4 w-4" />
                  {t("desc")}
                  <div className="flex-1" />
                  {header.column.getIsSorted() === "desc" && <Icon name="check" className="h-4 w-4" />}
                </CommandItem>
              </>
            )}
            {canHide && (
              <CommandItem
                className="flex cursor-pointer items-center gap-2 px-3 py-2"
                onSelect={() => {
                  header.column.toggleVisibility(false);
                  setOpen(false);
                }}>
                <Icon name="eye-off" className="h-4 w-4" />
                {t("hide")}
              </CommandItem>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

"use client";

import type { Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type { Table as ReactTableType, Header, HeaderGroup } from "@tanstack/react-table";
import { useVirtualizer, type Virtualizer, type VirtualItem } from "@tanstack/react-virtual";
import kebabCase from "lodash/kebabCase";
import { useEffect, useState, memo, useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Command, CommandList, CommandItem } from "@calcom/ui/components/command";
import { Icon } from "@calcom/ui/components/icon";
import { Popover, PopoverTrigger, PopoverContent } from "@calcom/ui/components/popover";
import {
  DivTable,
  DivTableBody,
  DivTableCell,
  DivTableHead,
  DivTableHeader,
  DivTableRow,
} from "@calcom/ui/components/table";

import { useColumnSizingVars } from "../hooks";
import { useColumnResizing } from "../hooks/useColumnResizing";

export type DivDataTablePropsFromWrapper<TData> = {
  table: ReactTableType<TData>;
  tableContainerRef: React.RefObject<HTMLDivElement>;
  isPending?: boolean;
  variant?: "default" | "compact";
  testId?: string;
  bodyTestId?: string;
  children?: React.ReactNode;
  enableColumnResizing?: boolean;
  className?: string;
  containerClassName?: string;
  headerClassName?: string;
  rowClassName?: string;
  paginationMode?: "infinite" | "standard";
  hasWrapperContext?: boolean;
};

export type DivDataTableProps<TData> = DivDataTablePropsFromWrapper<TData> & {
  onRowMouseclick?: (row: Row<TData>) => void;
  onScroll?: (e: Pick<React.UIEvent<HTMLDivElement, UIEvent>, "target">) => void;
  tableOverlay?: React.ReactNode;
  enableColumnResizing?: boolean;
};

export function DivDataTable<TData>({
  table,
  tableContainerRef,
  isPending,
  variant,
  onRowMouseclick,
  onScroll,
  children,
  enableColumnResizing,
  testId,
  bodyTestId,
  className,
  containerClassName,
  headerClassName,
  rowClassName,
  paginationMode = "infinite",
  hasWrapperContext = false,
  ...rest
}: DivDataTableProps<TData> & React.ComponentPropsWithoutRef<"div">) {
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
      setTimeout(() => {
        onScroll?.({ target });
      }, 100);
    }
  }, [virtualItemsCount, rows.length, tableContainerRef.current, paginationMode, onScroll]);

  const columnSizingVars = useColumnSizingVars({ table });

  useColumnResizing({
    enabled: Boolean(enableColumnResizing),
    table,
    tableContainerRef,
  });

  const leftPinnedColumns = useMemo(
    () => table.getAllFlatColumns().filter((column) => column.getIsPinned() === "left"),
    [table]
  );

  const rightPinnedColumns = useMemo(
    () => table.getAllFlatColumns().filter((column) => column.getIsPinned() === "right"),
    [table]
  );

  const centerColumns = useMemo(
    () => table.getAllFlatColumns().filter((column) => !column.getIsPinned()),
    [table]
  );

  return (
    <div
      className={classNames(
        !hasWrapperContext ? "grid" : "bg-muted grid rounded-xl px-0.5 pb-0.5",
        className
      )}
      style={{
        gridTemplateRows: "auto 1fr auto",
        gridTemplateAreas: "'header' 'body' 'footer'",
        ...rest.style,
      }}
      data-testid={testId ?? "data-table"}>
      <div
        ref={tableContainerRef}
        className={classNames(
          "relative",
          paginationMode === "infinite" && "h-[80dvh]", // Set a fixed height for the container
          containerClassName
        )}
        style={{ gridArea: "body" }}>
        <div className="flex h-full w-full">
          {/* Left pinned columns section */}
          {leftPinnedColumns.length > 0 && (
            <div className="z-10 flex-shrink-0">
              <DivTable
                className={classNames(
                  "data-table border-0",
                  !hasWrapperContext && "bg-muted rounded-xl px-0.5 pb-0.5"
                )}
                style={{
                  ...columnSizingVars,
                }}>
                <DivTableHeader className={classNames("z-10", headerClassName)}>
                  {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
                    <DivTableRow key={headerGroup.id} className="hover:bg-subtle flex border-none">
                      {headerGroup.headers
                        .filter((header) => header.column.getIsPinned() === "left")
                        .map((header: Header<TData, unknown>) => (
                          <DivTableHead
                            key={header.id}
                            style={{
                              width: `var(--header-${kebabCase(header?.id)}-size)`,
                            }}
                            className={classNames("relative flex shrink-0 items-center")}>
                            <DivTableHeadLabel header={header} />
                            {Boolean(enableColumnResizing) && header.column.getCanResize() && (
                              <div
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                                className={classNames(
                                  "group absolute right-0 top-0 h-full w-[5px] cursor-col-resize touch-none select-none opacity-0 hover:opacity-50",
                                  header.column.getIsResizing() && "!opacity-75"
                                )}>
                                <div className="bg-inverted mx-auto h-full w-[1px]" />
                              </div>
                            )}
                          </DivTableHead>
                        ))}
                    </DivTableRow>
                  ))}
                </DivTableHeader>
                {/* Left pinned columns body */}
                {table.getState().columnSizingInfo.isResizingColumn ? (
                  <MemoizedDivTableBody
                    table={table}
                    rowVirtualizer={rowVirtualizer}
                    rows={rows}
                    testId={bodyTestId}
                    variant={variant}
                    isPending={isPending}
                    onRowMouseclick={onRowMouseclick}
                    paginationMode={paginationMode}
                    rowClassName={rowClassName}
                    pinnedSection="left"
                  />
                ) : (
                  <DivDataTableBody
                    table={table}
                    rowVirtualizer={rowVirtualizer}
                    rows={rows}
                    testId={bodyTestId}
                    variant={variant}
                    isPending={isPending}
                    onRowMouseclick={onRowMouseclick}
                    paginationMode={paginationMode}
                    rowClassName={rowClassName}
                    pinnedSection="left"
                  />
                )}
              </DivTable>
            </div>
          )}

          {/* Middle scrollable section */}
          <div className="flex-grow overflow-auto" onScroll={onScroll}>
            <DivTable
              className={classNames(
                "data-table border-0",
                !hasWrapperContext && "bg-muted rounded-xl px-0.5 pb-0.5"
              )}
              style={{
                ...columnSizingVars,
                ...(Boolean(enableColumnResizing) && { width: table.getTotalSize() }),
              }}>
              <DivTableHeader className={classNames("z-10", headerClassName)}>
                {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
                  <DivTableRow key={headerGroup.id} className="hover:bg-subtle flex border-none">
                    {headerGroup.headers
                      .filter((header) => !header.column.getIsPinned())
                      .map((header: Header<TData, unknown>) => (
                        <DivTableHead
                          key={header.id}
                          style={{
                            width: `var(--header-${kebabCase(header?.id)}-size)`,
                          }}
                          className={classNames("relative flex shrink-0 items-center")}>
                          <DivTableHeadLabel header={header} />
                          {Boolean(enableColumnResizing) && header.column.getCanResize() && (
                            <div
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className={classNames(
                                "group absolute right-0 top-0 h-full w-[5px] cursor-col-resize touch-none select-none opacity-0 hover:opacity-50",
                                header.column.getIsResizing() && "!opacity-75"
                              )}>
                              <div className="bg-inverted mx-auto h-full w-[1px]" />
                            </div>
                          )}
                        </DivTableHead>
                      ))}
                  </DivTableRow>
                ))}
              </DivTableHeader>
              {/* Middle scrollable body */}
              {table.getState().columnSizingInfo.isResizingColumn ? (
                <MemoizedDivTableBody
                  table={table}
                  rowVirtualizer={rowVirtualizer}
                  rows={rows}
                  testId={bodyTestId}
                  variant={variant}
                  isPending={isPending}
                  onRowMouseclick={onRowMouseclick}
                  paginationMode={paginationMode}
                  rowClassName={rowClassName}
                  pinnedSection="middle"
                />
              ) : (
                <DivDataTableBody
                  table={table}
                  rowVirtualizer={rowVirtualizer}
                  rows={rows}
                  testId={bodyTestId}
                  variant={variant}
                  isPending={isPending}
                  onRowMouseclick={onRowMouseclick}
                  paginationMode={paginationMode}
                  rowClassName={rowClassName}
                  pinnedSection="middle"
                />
              )}
            </DivTable>
          </div>

          {/* Right pinned columns section */}
          {rightPinnedColumns.length > 0 && (
            <div className="z-10 flex-shrink-0">
              <DivTable
                className={classNames(
                  "data-table border-0",
                  !hasWrapperContext && "bg-muted rounded-xl px-0.5 pb-0.5"
                )}
                style={{
                  ...columnSizingVars,
                }}>
                <DivTableHeader className={classNames("z-10", headerClassName)}>
                  {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
                    <DivTableRow key={headerGroup.id} className="hover:bg-subtle flex border-none">
                      {headerGroup.headers
                        .filter((header) => header.column.getIsPinned() === "right")
                        .map((header: Header<TData, unknown>) => (
                          <DivTableHead
                            key={header.id}
                            style={{
                              width: `var(--header-${kebabCase(header?.id)}-size)`,
                            }}
                            className={classNames("relative flex shrink-0 items-center")}>
                            <DivTableHeadLabel header={header} />
                            {Boolean(enableColumnResizing) && header.column.getCanResize() && (
                              <div
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                                className={classNames(
                                  "group absolute right-0 top-0 h-full w-[5px] cursor-col-resize touch-none select-none opacity-0 hover:opacity-50",
                                  header.column.getIsResizing() && "!opacity-75"
                                )}>
                                <div className="bg-inverted mx-auto h-full w-[1px]" />
                              </div>
                            )}
                          </DivTableHead>
                        ))}
                    </DivTableRow>
                  ))}
                </DivTableHeader>
                {/* Right pinned columns body */}
                {table.getState().columnSizingInfo.isResizingColumn ? (
                  <MemoizedDivTableBody
                    table={table}
                    rowVirtualizer={rowVirtualizer}
                    rows={rows}
                    testId={bodyTestId}
                    variant={variant}
                    isPending={isPending}
                    onRowMouseclick={onRowMouseclick}
                    paginationMode={paginationMode}
                    rowClassName={rowClassName}
                    pinnedSection="right"
                  />
                ) : (
                  <DivDataTableBody
                    table={table}
                    rowVirtualizer={rowVirtualizer}
                    rows={rows}
                    testId={bodyTestId}
                    variant={variant}
                    isPending={isPending}
                    onRowMouseclick={onRowMouseclick}
                    paginationMode={paginationMode}
                    rowClassName={rowClassName}
                    pinnedSection="right"
                  />
                )}
              </DivTable>
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

const MemoizedDivTableBody = memo(
  DivDataTableBody,
  (prev, next) =>
    prev.table.options.data === next.table.options.data &&
    prev.rowVirtualizer === next.rowVirtualizer &&
    prev.rows === next.rows &&
    prev.testId === next.testId &&
    prev.variant === next.variant &&
    prev.isPending === next.isPending &&
    prev.onRowMouseclick === next.onRowMouseclick &&
    prev.paginationMode === next.paginationMode &&
    prev.rowClassName === next.rowClassName &&
    prev.pinnedSection === next.pinnedSection
) as typeof DivDataTableBody;

type DivDataTableBodyProps<TData> = {
  table: ReactTableType<TData>;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  rows: Row<TData>[];
  testId?: string;
  variant?: "default" | "compact";
  isPending?: boolean;
  onRowMouseclick?: (row: Row<TData>) => void;
  paginationMode?: "infinite" | "standard";
  rowClassName?: string;
  pinnedSection: "left" | "middle" | "right";
};

type RowToRender<TData> = {
  row: Row<TData>;
  virtualItem?: VirtualItem;
};

function DivDataTableBody<TData>({
  table,
  rowVirtualizer,
  rows,
  testId,
  variant,
  isPending,
  onRowMouseclick,
  paginationMode,
  rowClassName,
  pinnedSection,
}: DivDataTableBodyProps<TData> & { paginationMode?: "infinite" | "standard" }) {
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
      <DivTableBody className="relative grid" data-testid={testId} style={{ height: tableHeight }}>
        <DivTableRow>
          <DivTableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
            {t("no_results")}
          </DivTableCell>
        </DivTableRow>
      </DivTableBody>
    );
  }

  return (
    <DivTableBody
      className="border-subtle relative grid overflow-hidden rounded-xl border"
      data-testid={testId}
      style={{ height: tableHeight }}>
      {rowsToRender.map(({ row, virtualItem }) => (
        <DivTableRow
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
          {row
            .getVisibleCells()
            .filter((cell) => {
              const column = cell.column;
              if (pinnedSection === "left") return column.getIsPinned() === "left";
              if (pinnedSection === "right") return column.getIsPinned() === "right";
              return !column.getIsPinned();
            })
            .map((cell) => {
              const column = cell.column;
              return (
                <DivTableCell
                  key={cell.id}
                  style={{
                    width: `var(--col-${kebabCase(cell.column.id)}-size)`,
                  }}
                  className={classNames(
                    "bg-default group-hover:!bg-muted group-data-[state=selected]:bg-subtle flex shrink-0 items-center overflow-hidden",
                    variant === "compact" && "p-0"
                  )}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </DivTableCell>
              );
            })}
        </DivTableRow>
      ))}
    </DivTableBody>
  );
}

const DivTableHeadLabel = ({ header }: { header: Header<any, any> }) => {
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
            className="text-default truncate text-sm leading-none"
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

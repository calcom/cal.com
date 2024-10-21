"use client";

import type { Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type { Table as ReactTableType } from "@tanstack/react-table";
import { useVirtual } from "react-virtual";

import classNames from "@calcom/lib/classNames";

import Icon from "../icon/Icon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table/TableNew";

// Export DataTable components under a common namespace for better clarity
export { DataTableToolbar } from "./DataTableToolbar";
export { DataTableFilters } from "./filters";

export interface DataTableProps<TData, TValue> {
  table: ReactTableType<TData>;
  tableContainerRef: React.RefObject<HTMLDivElement>;
  isPending?: boolean;
  onRowMouseclick?: (row: Row<TData>) => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement, UIEvent>) => void;
  tableOverlay?: React.ReactNode;
  variant?: "default" | "compact";
  "data-testid"?: string;
  children?: React.ReactNode;
  hideHeader?: boolean;
}
export function DataTable<TData, TValue>({
  table,
  tableContainerRef,
  isPending,
  variant,
  onRowMouseclick,
  onScroll,
  children,
  hideHeader,
  ...rest
}: DataTableProps<TData, TValue> & React.ComponentPropsWithoutRef<"div">) {
  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtual({
    parentRef: tableContainerRef,
    size: rows.length,
    overscan: 10,
  });
  const { virtualItems: virtualRows, totalSize } = rowVirtualizer;
  const paddingTop = virtualRows.length > 0 ? virtualRows?.[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - (virtualRows?.[virtualRows.length - 1]?.end || 0) : 0;

  return (
    <div
      className={classNames(
        "grid h-[75dvh]", // Set a fixed height for the container
        rest.className
      )}
      style={{
        gridTemplateRows: "auto 1fr auto",
        gridTemplateAreas: "'header' 'body' 'footer'",
        ...rest.style,
      }}
      data-testid={rest["data-testid"] ?? "data-table"}>
      <div className="overflow-hidden" style={{ gridArea: "body" }}>
        <div ref={tableContainerRef} onScroll={onScroll} className="scrollbar-thin h-full overflow-y-auto">
          <div className="inline-block min-w-full align-middle">
            <Table>
              {!hideHeader && (
                <TableHeader className="sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={classNames(
                            header.column.getCanSort() ? "cursor-pointer select-none" : ""
                          )}>
                          <div
                            className="flex items-center"
                            onClick={header.column.getToggleSortingHandler()}>
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
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
              )}
              <TableBody>
                {paddingTop > 0 && (
                  <tr>
                    <td style={{ height: `${paddingTop}px` }} />
                  </tr>
                )}
                {virtualRows && !isPending ? (
                  virtualRows.map((virtualRow) => {
                    const row = rows[virtualRow.index] as Row<TData>;
                    return (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        onClick={() => onRowMouseclick && onRowMouseclick(row)}
                        className={classNames(
                          onRowMouseclick && "hover:cursor-pointer",
                          variant === "compact" && "!border-0"
                        )}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className={classNames(variant === "compact" && "p-1.5")}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
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
                {paddingBottom > 0 && (
                  <tr>
                    <td style={{ height: `${paddingBottom}px` }} />
                  </tr>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

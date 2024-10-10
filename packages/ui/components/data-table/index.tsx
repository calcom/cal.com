"use client";

import type { Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type { Table as ReactTableType } from "@tanstack/react-table";
import { useVirtual } from "react-virtual";

import classNames from "@calcom/lib/classNames";

import Icon from "../icon/Icon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table/TableNew";

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
}: DataTableProps<TData, TValue>) {
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
      ref={tableContainerRef}
      onScroll={onScroll}
      data-testid={rest["data-testid"] ?? "data-table"}
      style={{
        display: "grid",
        gridTemplateAreas: "'header' 'body' 'footer'",
      }}>
      <Table data-testid="" style={{ gridArea: "body" }}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  {...{
                    className: header.column.getCanSort() ? "cursor-pointer select-none " : "",
                    onClick: header.column.getToggleSortingHandler(),
                  }}>
                  <div className="flex items-center">
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
      {children}
    </div>
  );
}

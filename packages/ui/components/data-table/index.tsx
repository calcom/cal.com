import type {
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { useVirtual } from "react-virtual";

import classNames from "@calcom/lib/classNames";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table/TableNew";
import type { ActionItem } from "./DataTableSelectionBar";
import { DataTableSelectionBar } from "./DataTableSelectionBar";
import type { FilterableItems } from "./DataTableToolbar";
import { DataTableToolbar } from "./DataTableToolbar";

export interface DataTableProps<TData, TValue> {
  tableContainerRef: React.RefObject<HTMLDivElement>;
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  filterableItems?: FilterableItems;
  selectionOptions?: ActionItem<TData>[];
  tableCTA?: React.ReactNode;
  isLoading?: boolean;
  onRowMouseclick?: (row: Row<TData>) => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement, UIEvent>) => void;
  CTA?: React.ReactNode;
  tableOverlay?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterableItems,
  tableCTA,
  searchKey,
  selectionOptions,
  tableContainerRef,
  isLoading,
  tableOverlay,
  /** This should only really be used if you dont have actions in a row. */
  onRowMouseclick,
  onScroll,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    debugTable: true,
    manualPagination: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

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
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        filterableItems={filterableItems}
        searchKey={searchKey}
        tableCTA={tableCTA}
      />
      <div className="border-subtle border" ref={tableContainerRef} onScroll={onScroll}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} />
              </tr>
            )}
            {virtualRows && !isLoading ? (
              virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index] as Row<TData>;

                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => onRowMouseclick && onRowMouseclick(row)}
                    className={classNames(onRowMouseclick && "hover:cursor-pointer")}>
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
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
          {tableOverlay && tableOverlay}
        </Table>
      </div>
      {/* <DataTablePagination table={table} /> */}
      <DataTableSelectionBar table={table} actions={selectionOptions} />
    </div>
  );
}

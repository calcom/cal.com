"use client";

import type { ColumnDef, ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

import type { SVGComponent } from "@calcom/types/SVGComponent";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table/TableNew";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableSelectionBar } from "./DataTableSelectionBar";
import type { FilterableItems } from "./DataTableToolbar";
import { DataTableToolbar } from "./DataTableToolbar";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  filterableItems?: FilterableItems;
  selectionOptions?: {
    label: string;
    onClick: () => void;
    icon?: SVGComponent;
  }[];
  tableCTA?: React.ReactNode;
  // todo: get all accessoryKeys from columns
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterableItems,
  tableCTA,
  searchKey,
  selectionOptions,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);

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
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="relative space-y-4">
      <DataTableToolbar
        table={table}
        filterableItems={filterableItems}
        searchKey={searchKey}
        tableCTA={tableCTA}
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  if (
                    header.column.columnDef.meta?.hasPermissions &&
                    !header.column.columnDef.meta?.hasPermissions()
                  )
                    return null;

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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => {
                    if (
                      cell.column.columnDef.meta?.hasPermissions &&
                      !cell.column.columnDef.meta?.hasPermissions()
                    ) {
                      return null;
                    }
                    return (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
      <DataTableSelectionBar table={table} actions={selectionOptions} />
    </div>
  );
}

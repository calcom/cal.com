"use client";

import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
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
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

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
  pagination: PaginationState;
  setPagination: Dispatch<SetStateAction<PaginationState>>;
  pageCount?: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterableItems,
  tableCTA,
  searchKey,
  pagination,
  selectionOptions,
  setPagination,
  pageCount,
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
      pagination,
    },
    pageCount,
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
    onPaginationChange: (updateFn) => setPagination(() => updateFn(pagination)),
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
                  // if (
                  //   header.column.columnDef.meta?.hasPermissions &&
                  //   !header.column.columnDef.meta?.hasPermissions()
                  // )
                  //   return null;

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

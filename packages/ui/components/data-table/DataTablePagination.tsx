import type { Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "../button";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="text-muted-foreground flex-1 text-sm">
        {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s)
        selected.
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {table.getState().pagination.pageIndex} of {table.getPageCount() - 1}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            color="secondary"
            variant="icon"
            StartIcon={ChevronsLeft}
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}>
            <span className="sr-only">Go to first page</span>
          </Button>
          <Button
            color="secondary"
            variant="icon"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            StartIcon={ChevronLeft}>
            <span className="sr-only">Go to previous page</span>
          </Button>
          <Button
            color="secondary"
            variant="icon"
            StartIcon={ChevronRight}
            className="h-8 w-8 p-0"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}>
            <span className="sr-only">Go to next page</span>
          </Button>
          <Button
            color="secondary"
            variant="icon"
            className="hidden h-8 w-8 p-0 lg:flex"
            StartIcon={ChevronsRight}
            onClick={() => table.setPageIndex(table.getPageCount())}>
            <span className="sr-only">Go to last page</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

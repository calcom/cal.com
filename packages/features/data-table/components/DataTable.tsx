"use client";

import type { Row } from "@tanstack/react-table";
import type { Table as ReactTableType } from "@tanstack/react-table";

import { DivDataTable } from "./DivDataTable";

export type DataTablePropsFromWrapper<TData> = {
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

export type DataTableProps<TData> = DataTablePropsFromWrapper<TData> & {
  onRowMouseclick?: (row: Row<TData>) => void;
  onScroll?: (e: Pick<React.UIEvent<HTMLDivElement, UIEvent>, "target">) => void;
  tableOverlay?: React.ReactNode;
  enableColumnResizing?: boolean;
};

export function DataTable<TData>(props: DataTableProps<TData> & React.ComponentPropsWithoutRef<"div">) {
  return <DivDataTable {...props} />;
}

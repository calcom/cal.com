"use client";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useRef } from "react";

import { DataTable, DataTableProvider, DataTableToolbar } from "@calcom/features/data-table";
import { Badge } from "@calcom/ui/components/badge";

// Define your data type
type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  accepted: boolean;
};

// Sample data
const data: User[] = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "ADMIN", accepted: true },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "MEMBER", accepted: true },
  { id: 3, name: "Alice Johnson", email: "alice@example.com", role: "MEMBER", accepted: false },
  { id: 4, name: "Bob Anderson", email: "bob@example.com", role: "MEMBER", accepted: true },
  { id: 5, name: "Carol Williams", email: "carol@example.com", role: "ADMIN", accepted: true },
];

export function ResizableExample() {
  return (
    <DataTableProvider tableIdentifier="resizable-example" isDocs>
      <ResizableDataTable />
    </DataTableProvider>
  );
}

function ResizableDataTable() {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Define columns with enableResizing
  const columns: ColumnDef<User>[] = [
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: "Name",
      cell: ({ row }) => <div>{row.original.name}</div>,
      enableResizing: true,
      size: 200, // initial size
    },
    {
      id: "email",
      accessorFn: (row) => row.email,
      header: "Email",
      cell: ({ row }) => <div>{row.original.email}</div>,
      enableResizing: true,
      size: 250, // initial size
    },
    {
      id: "role",
      accessorFn: (row) => row.role,
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={row.original.role === "ADMIN" ? "blue" : "gray"}>{row.original.role}</Badge>
      ),
      enableResizing: true,
      size: 100, // initial size
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.accepted ? "green" : "orange"}>
          {row.original.accepted ? "Active" : "Pending"}
        </Badge>
      ),
      enableResizing: true,
      size: 100, // initial size
    },
  ];

  // Set up TanStack table
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: "onChange",
  });

  return (
    <div className="space-y-2">
      <p className="text-subtle text-sm">
        Try resizing columns by dragging the dividers between column headers.
      </p>
      <DataTable table={table} tableContainerRef={tableContainerRef} enableColumnResizing={true}>
        <DataTableToolbar.Root>
          <div className="flex w-full gap-2">
            <DataTableToolbar.SearchBar />
          </div>
        </DataTableToolbar.Root>
      </DataTable>
    </div>
  );
}

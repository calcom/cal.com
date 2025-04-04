"use client";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useRef } from "react";

import {
  DataTable,
  DataTableProvider,
  DataTableToolbar,
  DataTableFilters,
} from "@calcom/features/data-table";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";

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

export function BasicExample() {
  return (
    <DataTableProvider tableIdentifier="basic-example" isDocs>
      <BasicDataTable />
    </DataTableProvider>
  );
}

function BasicDataTable() {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Define columns
  const columns: ColumnDef<User>[] = [
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: "Name",
      cell: ({ row }) => <div>{row.original.name}</div>,
    },
    {
      id: "email",
      accessorFn: (row) => row.email,
      header: "Email",
      cell: ({ row }) => <div>{row.original.email}</div>,
    },
    {
      id: "role",
      accessorFn: (row) => row.role,
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={row.original.role === "ADMIN" ? "blue" : "gray"}>{row.original.role}</Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.accepted ? "green" : "orange"}>
          {row.original.accepted ? "Active" : "Pending"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="icon" color="secondary" StartIcon="ellipsis">
          <span className="sr-only">Actions</span>
        </Button>
      ),
    },
  ];

  // Set up TanStack table
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <DataTable table={table} tableContainerRef={tableContainerRef}>
      <DataTableToolbar.Root>
        <div className="flex w-full gap-2">
          <DataTableToolbar.SearchBar />
          <DataTableFilters.ColumnVisibilityButton table={table} />
          <DataTableToolbar.CTA
            type="button"
            color="primary"
            StartIcon="plus"
            onClick={() => alert("Add new user")}>
            Add User
          </DataTableToolbar.CTA>
        </div>
      </DataTableToolbar.Root>
    </DataTable>
  );
}

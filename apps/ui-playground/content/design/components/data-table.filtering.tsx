"use client";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getFacetedUniqueValues,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useRef } from "react";

import {
  DataTable,
  DataTableProvider,
  DataTableToolbar,
  DataTableFilters,
  useColumnFilters,
} from "@calcom/features/data-table";
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
  { id: 6, name: "Dave Brown", email: "dave@example.com", role: "OWNER", accepted: true },
  { id: 7, name: "Eve Taylor", email: "eve@example.com", role: "MEMBER", accepted: false },
];

export function FilteringExample() {
  return (
    <DataTableProvider tableIdentifier="filtering-example" isDocs>
      <FilteringDataTable />
    </DataTableProvider>
  );
}

function FilteringDataTable() {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const columnFilters = useColumnFilters();

  // Define columns
  const columns: ColumnDef<User>[] = [
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: "Name",
      cell: ({ row }) => <div>{row.original.name}</div>,
      filterFn: "includesString",
    },
    {
      id: "email",
      accessorFn: (row) => row.email,
      header: "Email",
      cell: ({ row }) => <div>{row.original.email}</div>,
      filterFn: "includesString",
    },
    {
      id: "role",
      accessorFn: (row) => row.role,
      header: "Role",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.role === "ADMIN" ? "blue" : row.original.role === "OWNER" ? "purple" : "gray"
          }>
          {row.original.role}
        </Badge>
      ),
      filterFn: (row, id, filterValue) => {
        const { data } = filterValue;
        return data.includes(row.getValue(id));
      },
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (row) => row.accepted,
      cell: ({ row }) => (
        <Badge variant={row.original.accepted ? "green" : "orange"}>
          {row.original.accepted ? "Active" : "Pending"}
        </Badge>
      ),
      filterFn: (row, id, filterValue) => {
        const { data } = filterValue;
        if (data.includes("ACTIVE") && data.includes("PENDING")) return true;
        if (data.includes("ACTIVE")) return row.getValue(id) === true;
        if (data.includes("PENDING")) return row.getValue(id) === false;
        return true;
      },
    },
  ];

  // Set up TanStack table
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    state: {
      columnFilters,
    },
  });

  return (
    <DataTable table={table} tableContainerRef={tableContainerRef}>
      <DataTableToolbar.Root>
        <div className="flex w-full gap-2">
          <DataTableToolbar.SearchBar />
          <DataTableFilters.AddFilterButton table={table} />
          <DataTableFilters.ColumnVisibilityButton table={table} />
        </div>
        <div className="flex gap-2 justify-self-start">
          <DataTableFilters.ActiveFilters table={table} />
        </div>
      </DataTableToolbar.Root>
    </DataTable>
  );
}

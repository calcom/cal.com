"use client";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useRef } from "react";

import {
  DataTable,
  DataTableProvider,
  DataTableToolbar,
  DataTablePagination,
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

// Generate more sample data
const data: User[] = Array(20)
  .fill(null)
  .map((_, index) => {
    const roles = ["ADMIN", "MEMBER", "OWNER"];
    const names = ["John", "Jane", "Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace", "Hank"];
    const lastNames = [
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Jones",
      "Miller",
      "Davis",
      "Wilson",
      "Taylor",
      "Clark",
    ];

    const firstName = names[Math.floor(Math.random() * names.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    const role = roles[Math.floor(Math.random() * roles.length)];
    const accepted = Math.random() > 0.2; // 80% chance of being accepted

    return {
      id: index + 1,
      name,
      email,
      role,
      accepted,
    };
  });

export function PaginationExample() {
  return (
    <DataTableProvider tableIdentifier="pagination-example" isDocs>
      <PaginationDataTable />
    </DataTableProvider>
  );
}

function PaginationDataTable() {
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
      cell: ({ row }) => {
        const variant =
          row.original.role === "ADMIN" ? "blue" : row.original.role === "OWNER" ? "purple" : "gray";

        return <Badge variant={variant}>{row.original.role}</Badge>;
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
    },
  ];

  // Set up TanStack table with pagination
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  return (
    <DataTable table={table} tableContainerRef={tableContainerRef} paginationMode="standard">
      <DataTableToolbar.Root>
        <div className="flex w-full gap-2">
          <DataTableToolbar.SearchBar />
        </div>
      </DataTableToolbar.Root>

      {/* Standard Pagination */}
      <DataTablePagination table={table} />
    </DataTable>
  );
}

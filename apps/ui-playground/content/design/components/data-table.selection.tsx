"use client";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useRef, useState } from "react";

import {
  DataTable,
  DataTableProvider,
  DataTableToolbar,
  DataTableFilters,
  DataTableSelectionBar,
} from "@calcom/features/data-table";
import { Badge } from "@calcom/ui/components/badge";
import { Checkbox } from "@calcom/ui/components/form";

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

export function SelectionExample() {
  return (
    <DataTableProvider tableIdentifier="selection-example" isDocs>
      <SelectionDataTable />
    </DataTableProvider>
  );
}

function SelectionDataTable() {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [rowSelection, setRowSelection] = useState({});

  // Define columns
  const columns: ColumnDef<User>[] = [
    {
      id: "select",
      enableHiding: false,
      enableSorting: false,
      size: 30,
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
    },
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
  ];

  // Set up TanStack table
  const table = useReactTable({
    data,
    columns,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
  });

  const numberOfSelectedRows = table.getSelectedRowModel().rows.length;

  return (
    <>
      <DataTable table={table} tableContainerRef={tableContainerRef}>
        <DataTableToolbar.Root>
          <div className="flex w-full gap-2">
            <DataTableToolbar.SearchBar />
            <DataTableFilters.ColumnVisibilityButton table={table} />
          </div>
        </DataTableToolbar.Root>

        {/* Selection Bar appears when rows are selected */}
        {numberOfSelectedRows > 0 && (
          <DataTableSelectionBar.Root>
            <p className="text-brand-subtle px-2 text-center text-xs leading-none sm:text-sm sm:font-medium">
              {numberOfSelectedRows} item(s) selected
            </p>
            <DataTableSelectionBar.Button
              color="primary"
              onClick={() => alert(`Selected ${numberOfSelectedRows} user(s)`)}
              icon="user">
              View Users
            </DataTableSelectionBar.Button>
            <DataTableSelectionBar.Button
              color="destructive"
              onClick={() => {
                alert(`Deleting ${numberOfSelectedRows} user(s)`);
                setRowSelection({});
              }}
              icon="trash">
              Delete
            </DataTableSelectionBar.Button>
          </DataTableSelectionBar.Root>
        )}
      </DataTable>
    </>
  );
}

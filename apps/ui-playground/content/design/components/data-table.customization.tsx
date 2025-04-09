"use client";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useRef, useState } from "react";

import { DataTable, DataTableProvider, DataTableToolbar } from "@calcom/features/data-table";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";

// Define your data type
type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  accepted: boolean;
  avatarUrl: string;
};

// Sample data
const data: User[] = [
  {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    role: "ADMIN",
    accepted: true,
    avatarUrl: "https://ui-avatars.com/api/?name=John+Doe",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane@example.com",
    role: "MEMBER",
    accepted: true,
    avatarUrl: "https://ui-avatars.com/api/?name=Jane+Smith",
  },
  {
    id: 3,
    name: "Alice Johnson",
    email: "alice@example.com",
    role: "MEMBER",
    accepted: false,
    avatarUrl: "https://ui-avatars.com/api/?name=Alice+Johnson",
  },
  {
    id: 4,
    name: "Bob Anderson",
    email: "bob@example.com",
    role: "MEMBER",
    accepted: true,
    avatarUrl: "https://ui-avatars.com/api/?name=Bob+Anderson",
  },
  {
    id: 5,
    name: "Carol Williams",
    email: "carol@example.com",
    role: "ADMIN",
    accepted: true,
    avatarUrl: "https://ui-avatars.com/api/?name=Carol+Williams",
  },
];

export function CustomizationExample() {
  return (
    <DataTableProvider isDocs>
      <CustomizedDataTable />
    </DataTableProvider>
  );
}

function CustomizedDataTable() {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  // Define columns with custom styling and rendering
  const columns: ColumnDef<User>[] = [
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: "User",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar size="sm" alt={row.original.name} imageSrc={row.original.avatarUrl} />
          <div>
            <div className="text-emphasis text-sm font-medium leading-none">{row.original.name}</div>
            <div className="text-subtle mt-1 text-sm leading-none">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      accessorFn: (row) => row.role,
      header: "Role",
      cell: ({ row }) => (
        <div className="flex h-full flex-wrap items-center gap-2">
          {!row.original.accepted && (
            <Badge variant="orange" className="text-xs">
              Pending
            </Badge>
          )}
          <Badge variant={row.original.role === "MEMBER" ? "gray" : "blue"}>{row.original.role}</Badge>
        </div>
      ),
    },
    {
      id: "actions",
      size: 90,
      enableResizing: false,
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <Button
            variant="icon"
            color="secondary"
            StartIcon="pencil"
            onClick={() => alert(`Edit user: ${row.original.name}`)}
          />
          <Button
            variant="icon"
            color="secondary"
            StartIcon="trash"
            onClick={() => alert(`Delete user: ${row.original.name}`)}
          />
        </div>
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
    state: {
      sorting,
    },
    onSortingChange: setSorting,
  });

  return (
    <div className="space-y-4">
      <p className="text-subtle text-sm">This example shows custom rendering and styling for table cells.</p>
      <DataTable
        table={table}
        tableContainerRef={tableContainerRef}
        variant="compact"
        className="border-emphasis rounded-lg shadow-sm"
        containerClassName="border-subtle"
        headerClassName="bg-emphasis text-emphasis"
        rowClassName="hover:bg-subtle cursor-pointer">
        <DataTableToolbar.Root className="bg-emphasis rounded-t-lg px-4 py-3">
          <div className="flex w-full gap-2">
            <DataTableToolbar.SearchBar className="bg-default shadow-sm" />
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

      <div className="border-emphasis rounded-md border p-4">
        <h3 className="text-emphasis mb-2 text-sm font-medium">Custom Styling Options</h3>
        <ul className="text-subtle ml-4 list-disc text-xs">
          <li>
            Set <code>variant=&quot;compact&quot;</code> for a more condensed view
          </li>
          <li>
            Customize with <code>className</code>, <code>containerClassName</code>,{" "}
            <code>headerClassName</code>, and <code>rowClassName</code>
          </li>
          <li>Customize cell rendering with component composition</li>
          <li>
            Style the toolbar with <code>className</code> props
          </li>
        </ul>
      </div>
    </div>
  );
}

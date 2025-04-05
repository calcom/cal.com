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
  useFetchMoreOnBottomReached,
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

// Generate large sample data
const generateUsers = (start: number, count: number): User[] => {
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

  return Array(count)
    .fill(null)
    .map((_, index) => {
      const idx = start + index;
      const firstName = names[Math.floor(Math.random() * names.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${idx}@example.com`;
      const role = roles[Math.floor(Math.random() * roles.length)];
      const accepted = Math.random() > 0.2; // 80% chance of being accepted

      return {
        id: idx,
        name,
        email,
        role,
        accepted,
      };
    });
};

export function InfiniteScrollExample() {
  return (
    <DataTableProvider tableIdentifier="infinite-scroll-example" isDocs>
      <InfiniteDataTable />
    </DataTableProvider>
  );
}

function InfiniteDataTable() {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<User[]>(generateUsers(1, 20));
  const [isFetching, setIsFetching] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);

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

  // Set up TanStack table
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Mock API fetch function
  const fetchMoreData = () => {
    if (isFetching || !hasNextPage) return;

    setIsFetching(true);

    // Simulate API delay
    setTimeout(() => {
      const newUsers = generateUsers(data.length + 1, 10);
      setData((prev) => [...prev, ...newUsers]);
      setIsFetching(false);

      // Simulate running out of data after 100 items
      if (data.length + newUsers.length >= 100) {
        setHasNextPage(false);
      }
    }, 1000);
  };

  // Use the hook to fetch more data when scrolling to the bottom
  useFetchMoreOnBottomReached({
    tableContainerRef,
    fetchNextPage: fetchMoreData,
    hasNextPage,
    isFetching,
  });

  return (
    <div className="space-y-2">
      <p className="text-subtle text-sm">
        Scroll down to load more data. This example demonstrates infinite scrolling with virtualization.
      </p>
      <DataTable
        table={table}
        tableContainerRef={tableContainerRef}
        paginationMode="infinite"
        isPending={isFetching}
        onScroll={(e) => {
          // The hook will handle fetching, but we could do additional things here
        }}>
        <DataTableToolbar.Root>
          <div className="flex w-full gap-2">
            <DataTableToolbar.SearchBar />
          </div>
        </DataTableToolbar.Root>

        {/* Status indicator for loading more data */}
        {isFetching && (
          <div className="text-muted-foreground py-2 text-center text-sm">Loading more data...</div>
        )}

        {!hasNextPage && (
          <div className="text-muted-foreground py-2 text-center text-sm">No more data to load</div>
        )}
      </DataTable>
    </div>
  );
}

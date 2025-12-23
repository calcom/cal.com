import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRef, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
} from "@tanstack/react-table";

import { DataTable } from "./DataTable";

const meta = {
  title: "Features/DataTable",
  component: DataTable,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data types
type Person = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "pending";
};

type Booking = {
  id: number;
  title: string;
  date: string;
  attendee: string;
  duration: number;
  status: "confirmed" | "pending" | "cancelled";
};

// Sample data
const samplePeople: Person[] = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "Admin", status: "active" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "Member", status: "active" },
  { id: 3, name: "Bob Wilson", email: "bob@example.com", role: "Member", status: "inactive" },
  { id: 4, name: "Alice Johnson", email: "alice@example.com", role: "Editor", status: "active" },
  { id: 5, name: "Charlie Brown", email: "charlie@example.com", role: "Viewer", status: "pending" },
];

const sampleBookings: Booking[] = [
  {
    id: 1,
    title: "Product Demo",
    date: "Dec 20, 2024",
    attendee: "john@company.com",
    duration: 30,
    status: "confirmed",
  },
  {
    id: 2,
    title: "Sales Call",
    date: "Dec 21, 2024",
    attendee: "jane@company.com",
    duration: 45,
    status: "pending",
  },
  {
    id: 3,
    title: "Technical Review",
    date: "Dec 22, 2024",
    attendee: "bob@company.com",
    duration: 60,
    status: "cancelled",
  },
  {
    id: 4,
    title: "Team Sync",
    date: "Dec 23, 2024",
    attendee: "alice@company.com",
    duration: 30,
    status: "confirmed",
  },
  {
    id: 5,
    title: "Client Meeting",
    date: "Dec 24, 2024",
    attendee: "charlie@company.com",
    duration: 60,
    status: "confirmed",
  },
];

// Generate large dataset for infinite scroll
const generateLargeDataset = (count: number): Person[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Person ${i + 1}`,
    email: `person${i + 1}@example.com`,
    role: ["Admin", "Member", "Editor", "Viewer"][i % 4],
    status: (["active", "inactive", "pending"] as const)[i % 3],
  }));
};

// Column helpers
const personColumnHelper = createColumnHelper<Person>();
const bookingColumnHelper = createColumnHelper<Booking>();

// Default story with basic table
export const Default: Story = {
  render: () => {
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const columns = useMemo(
      () => [
        personColumnHelper.accessor("name", {
          header: "Name",
          cell: (info) => info.getValue(),
        }),
        personColumnHelper.accessor("email", {
          header: "Email",
          cell: (info) => info.getValue(),
        }),
        personColumnHelper.accessor("role", {
          header: "Role",
          cell: (info) => info.getValue(),
        }),
        personColumnHelper.accessor("status", {
          header: "Status",
          cell: (info) => {
            const status = info.getValue();
            const statusColors = {
              active: "bg-green-100 text-green-800",
              inactive: "bg-gray-100 text-gray-800",
              pending: "bg-yellow-100 text-yellow-800",
            };
            return (
              <span className={`rounded-full px-2 py-1 text-xs ${statusColors[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            );
          },
        }),
      ],
      []
    );

    const table = useReactTable({
      data: samplePeople,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
    });

    return (
      <div style={{ width: "800px", maxWidth: "90vw" }}>
        <DataTable table={table} tableContainerRef={tableContainerRef} paginationMode="standard" />
      </div>
    );
  },
};

// Compact variant
export const CompactVariant: Story = {
  render: () => {
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const columns = useMemo(
      () => [
        personColumnHelper.accessor("id", {
          header: "ID",
          cell: (info) => `#${info.getValue()}`,
          size: 60,
        }),
        personColumnHelper.accessor("name", {
          header: "Name",
          cell: (info) => info.getValue(),
        }),
        personColumnHelper.accessor("email", {
          header: "Email",
          cell: (info) => info.getValue(),
        }),
      ],
      []
    );

    const table = useReactTable({
      data: samplePeople,
      columns,
      getCoreRowModel: getCoreRowModel(),
    });

    return (
      <div style={{ width: "600px", maxWidth: "90vw" }}>
        <DataTable
          table={table}
          tableContainerRef={tableContainerRef}
          variant="compact"
          paginationMode="standard"
        />
      </div>
    );
  },
};

// With sorting enabled
export const WithSorting: Story = {
  render: () => {
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const columns = useMemo(
      () => [
        bookingColumnHelper.accessor("title", {
          header: "Title",
          cell: (info) => <span className="font-medium">{info.getValue()}</span>,
          enableSorting: true,
        }),
        bookingColumnHelper.accessor("date", {
          header: "Date",
          cell: (info) => info.getValue(),
          enableSorting: true,
        }),
        bookingColumnHelper.accessor("duration", {
          header: "Duration",
          cell: (info) => `${info.getValue()} min`,
          enableSorting: true,
        }),
        bookingColumnHelper.accessor("status", {
          header: "Status",
          cell: (info) => {
            const status = info.getValue();
            const statusColors = {
              confirmed: "bg-green-100 text-green-800",
              pending: "bg-yellow-100 text-yellow-800",
              cancelled: "bg-red-100 text-red-800",
            };
            return (
              <span className={`rounded-full px-2 py-1 text-xs ${statusColors[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            );
          },
          enableSorting: true,
        }),
      ],
      []
    );

    const table = useReactTable({
      data: sampleBookings,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
    });

    return (
      <div style={{ width: "800px", maxWidth: "90vw" }}>
        <DataTable table={table} tableContainerRef={tableContainerRef} paginationMode="standard" />
      </div>
    );
  },
};

// With column resizing
export const WithColumnResizing: Story = {
  render: () => {
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const columns = useMemo(
      () => [
        personColumnHelper.accessor("name", {
          header: "Name",
          cell: (info) => info.getValue(),
          size: 200,
          minSize: 100,
          maxSize: 400,
        }),
        personColumnHelper.accessor("email", {
          header: "Email",
          cell: (info) => info.getValue(),
          size: 250,
          minSize: 150,
          maxSize: 400,
        }),
        personColumnHelper.accessor("role", {
          header: "Role",
          cell: (info) => info.getValue(),
          size: 150,
          minSize: 100,
          maxSize: 300,
        }),
      ],
      []
    );

    const table = useReactTable({
      data: samplePeople,
      columns,
      getCoreRowModel: getCoreRowModel(),
      enableColumnResizing: true,
      columnResizeMode: "onChange",
    });

    return (
      <div style={{ width: "800px", maxWidth: "90vw" }}>
        <DataTable
          table={table}
          tableContainerRef={tableContainerRef}
          enableColumnResizing
          paginationMode="standard"
        />
      </div>
    );
  },
};

// With row click handler
export const WithRowClick: Story = {
  render: () => {
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const columns = useMemo(
      () => [
        personColumnHelper.accessor("name", {
          header: "Name",
          cell: (info) => info.getValue(),
        }),
        personColumnHelper.accessor("email", {
          header: "Email",
          cell: (info) => info.getValue(),
        }),
        personColumnHelper.accessor("role", {
          header: "Role",
          cell: (info) => info.getValue(),
        }),
      ],
      []
    );

    const table = useReactTable({
      data: samplePeople,
      columns,
      getCoreRowModel: getCoreRowModel(),
    });

    const handleRowClick = (row: any) => {
      alert(`Clicked on: ${row.original.name}`);
    };

    return (
      <div style={{ width: "800px", maxWidth: "90vw" }}>
        <DataTable
          table={table}
          tableContainerRef={tableContainerRef}
          onRowMouseclick={handleRowClick}
          paginationMode="standard"
        />
      </div>
    );
  },
};

// Empty state
export const EmptyState: Story = {
  render: () => {
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const columns = useMemo(
      () => [
        personColumnHelper.accessor("name", {
          header: "Name",
          cell: (info) => info.getValue(),
        }),
        personColumnHelper.accessor("email", {
          header: "Email",
          cell: (info) => info.getValue(),
        }),
        personColumnHelper.accessor("role", {
          header: "Role",
          cell: (info) => info.getValue(),
        }),
      ],
      []
    );

    const table = useReactTable({
      data: [],
      columns,
      getCoreRowModel: getCoreRowModel(),
    });

    return (
      <div style={{ width: "800px", maxWidth: "90vw" }}>
        <DataTable table={table} tableContainerRef={tableContainerRef} paginationMode="standard" />
      </div>
    );
  },
};

// Loading state
export const LoadingState: Story = {
  render: () => {
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const columns = useMemo(
      () => [
        personColumnHelper.accessor("name", {
          header: "Name",
          cell: (info) => info.getValue(),
        }),
        personColumnHelper.accessor("email", {
          header: "Email",
          cell: (info) => info.getValue(),
        }),
        personColumnHelper.accessor("role", {
          header: "Role",
          cell: (info) => info.getValue(),
        }),
      ],
      []
    );

    const table = useReactTable({
      data: samplePeople,
      columns,
      getCoreRowModel: getCoreRowModel(),
    });

    return (
      <div style={{ width: "800px", maxWidth: "90vw" }}>
        <DataTable
          table={table}
          tableContainerRef={tableContainerRef}
          isPending
          paginationMode="standard"
        />
      </div>
    );
  },
};

// Infinite scroll mode
export const InfiniteScroll: Story = {
  render: () => {
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const largeDataset = useMemo(() => generateLargeDataset(100), []);

    const columns = useMemo(
      () => [
        personColumnHelper.accessor("id", {
          header: "ID",
          cell: (info) => `#${info.getValue()}`,
          size: 80,
        }),
        personColumnHelper.accessor("name", {
          header: "Name",
          cell: (info) => info.getValue(),
        }),
        personColumnHelper.accessor("email", {
          header: "Email",
          cell: (info) => info.getValue(),
        }),
        personColumnHelper.accessor("role", {
          header: "Role",
          cell: (info) => info.getValue(),
        }),
        personColumnHelper.accessor("status", {
          header: "Status",
          cell: (info) => {
            const status = info.getValue();
            const statusColors = {
              active: "bg-green-100 text-green-800",
              inactive: "bg-gray-100 text-gray-800",
              pending: "bg-yellow-100 text-yellow-800",
            };
            return (
              <span className={`rounded-full px-2 py-1 text-xs ${statusColors[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            );
          },
        }),
      ],
      []
    );

    const table = useReactTable({
      data: largeDataset,
      columns,
      getCoreRowModel: getCoreRowModel(),
    });

    return (
      <div style={{ width: "900px", maxWidth: "90vw" }}>
        <DataTable table={table} tableContainerRef={tableContainerRef} paginationMode="infinite" />
      </div>
    );
  },
};

// With custom row className
export const WithCustomRowStyling: Story = {
  render: () => {
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const columns = useMemo(
      () => [
        personColumnHelper.accessor("name", {
          header: "Name",
          cell: (info) => info.getValue(),
        }),
        personColumnHelper.accessor("email", {
          header: "Email",
          cell: (info) => info.getValue(),
        }),
        personColumnHelper.accessor("status", {
          header: "Status",
          cell: (info) => info.getValue(),
        }),
      ],
      []
    );

    const table = useReactTable({
      data: samplePeople,
      columns,
      getCoreRowModel: getCoreRowModel(),
    });

    const getRowClassName = (row: any) => {
      if (row.original.status === "inactive") {
        return "opacity-50";
      }
      if (row.original.status === "pending") {
        return "bg-yellow-50";
      }
      return "";
    };

    return (
      <div style={{ width: "800px", maxWidth: "90vw" }}>
        <DataTable
          table={table}
          tableContainerRef={tableContainerRef}
          rowClassName={getRowClassName}
          paginationMode="standard"
        />
      </div>
    );
  },
};

// With column filtering
export const WithFiltering: Story = {
  render: () => {
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const columns = useMemo(
      () => [
        personColumnHelper.accessor("name", {
          header: "Name",
          cell: (info) => info.getValue(),
          enableColumnFilter: true,
        }),
        personColumnHelper.accessor("email", {
          header: "Email",
          cell: (info) => info.getValue(),
          enableColumnFilter: true,
        }),
        personColumnHelper.accessor("role", {
          header: "Role",
          cell: (info) => info.getValue(),
          enableColumnFilter: true,
        }),
        personColumnHelper.accessor("status", {
          header: "Status",
          cell: (info) => {
            const status = info.getValue();
            const statusColors = {
              active: "bg-green-100 text-green-800",
              inactive: "bg-gray-100 text-gray-800",
              pending: "bg-yellow-100 text-yellow-800",
            };
            return (
              <span className={`rounded-full px-2 py-1 text-xs ${statusColors[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            );
          },
          enableColumnFilter: true,
        }),
      ],
      []
    );

    const table = useReactTable({
      data: samplePeople,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getSortedRowModel: getSortedRowModel(),
    });

    return (
      <div style={{ width: "800px", maxWidth: "90vw" }}>
        <DataTable table={table} tableContainerRef={tableContainerRef} paginationMode="standard" />
      </div>
    );
  },
};

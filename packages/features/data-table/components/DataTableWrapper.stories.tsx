import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { createColumnHelper, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";

import { DataTableProvider } from "../DataTableProvider";
import { DataTableWrapper } from "./DataTableWrapper";

type SampleData = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
};

const columnHelper = createColumnHelper<SampleData>();

const sampleData: SampleData[] = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "Admin", status: "active" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "User", status: "active" },
  { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "User", status: "inactive" },
  { id: 4, name: "Alice Williams", email: "alice@example.com", role: "Editor", status: "active" },
  { id: 5, name: "Charlie Brown", email: "charlie@example.com", role: "User", status: "inactive" },
];

const sampleColumns = [
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("email", {
    header: "Email",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("role", {
    header: "Role",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => (
      <span
        className={
          info.getValue() === "active" ? "text-green-600 font-semibold" : "text-gray-400 font-semibold"
        }>
        {info.getValue()}
      </span>
    ),
  }),
];

const DataTableWrapperWithTable = (
  props: Omit<React.ComponentProps<typeof DataTableWrapper<SampleData>>, "table"> & {
    data?: SampleData[];
  }
) => {
  const { data = sampleData, ...rest } = props;
  const table = useReactTable({
    data,
    columns: sampleColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataTableProvider tableIdentifier="storybook-table">
      <DataTableWrapper table={table} {...rest} />
    </DataTableProvider>
  );
};

const meta = {
  component: DataTableWrapper,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[900px]">
        <Story />
      </div>
    ),
  ],
  render: (args) => <DataTableWrapperWithTable {...args} />,
} satisfies Meta<typeof DataTableWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    paginationMode: "standard",
    isPending: false,
  },
};

export const WithToolbars: Story = {
  args: {
    paginationMode: "standard",
    isPending: false,
    ToolbarLeft: (
      <div className="flex gap-2">
        <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md">Add User</button>
        <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-md">Import</button>
      </div>
    ),
    ToolbarRight: (
      <div className="flex gap-2">
        <input
          type="search"
          placeholder="Search..."
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
        />
        <button className="px-3 py-1.5 text-sm border border-gray-300 rounded-md">Filter</button>
      </div>
    ),
  },
};

export const CompactVariant: Story = {
  args: {
    paginationMode: "standard",
    variant: "compact",
    isPending: false,
  },
};

export const LoadingState: Story = {
  args: {
    paginationMode: "standard",
    isPending: true,
    LoaderView: (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    ),
  },
};

export const EmptyState: Story = {
  args: {
    paginationMode: "standard",
    data: [],
    isPending: false,
    EmptyView: (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <svg
          className="w-12 h-12 text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <h3 className="text-lg font-semibold mb-1">No users found</h3>
        <p className="text-gray-500">Get started by adding your first user</p>
      </div>
    ),
  },
};

export const ErrorState: Story = {
  args: {
    paginationMode: "standard",
    isPending: false,
    hasError: true,
    ErrorView: (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <svg className="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-lg font-semibold mb-1">Error loading data</h3>
        <p className="text-gray-500 mb-4">Something went wrong while fetching the data</p>
        <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md">Try Again</button>
      </div>
    ),
  },
};

export const InfinitePagination: Story = {
  args: {
    paginationMode: "infinite",
    hasNextPage: true,
    fetchNextPage: () => console.log("Fetching next page..."),
    isFetching: false,
    isPending: false,
  },
};

export const WithTotalRowCount: Story = {
  args: {
    paginationMode: "standard",
    totalRowCount: 127,
    isPending: false,
  },
};

export const WithCustomClassName: Story = {
  args: {
    paginationMode: "standard",
    isPending: false,
    className: "border-2 border-blue-500",
    containerClassName: "bg-gray-50",
    headerClassName: "bg-blue-100",
  },
};

export const WithRowClickHandler: Story = {
  args: {
    paginationMode: "standard",
    isPending: false,
    onRowMouseclick: (row) => {
      alert(`Clicked on ${row.original.name}`);
    },
  },
};

export const WithCustomRowClassName: Story = {
  args: {
    paginationMode: "standard",
    isPending: false,
    rowClassName: (row) => {
      return row.original.status === "inactive" ? "opacity-50" : "";
    },
  },
};

export const ComplexExample: Story = {
  args: {
    paginationMode: "standard",
    isPending: false,
    variant: "default",
    totalRowCount: 127,
    ToolbarLeft: (
      <div className="flex gap-2 items-center">
        <h2 className="text-lg font-semibold">User Management</h2>
        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">127 users</span>
      </div>
    ),
    ToolbarRight: (
      <div className="flex gap-2">
        <input
          type="search"
          placeholder="Search users..."
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
        />
        <select className="px-3 py-1.5 text-sm border border-gray-300 rounded-md">
          <option>All Roles</option>
          <option>Admin</option>
          <option>User</option>
          <option>Editor</option>
        </select>
        <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md">Add User</button>
      </div>
    ),
    onRowMouseclick: (row) => {
      console.log("Selected user:", row.original.name);
    },
  },
};

export const LargeDataset: Story = {
  args: {
    paginationMode: "standard",
    isPending: false,
    data: Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: ["Admin", "User", "Editor"][i % 3],
      status: i % 3 === 0 ? "inactive" : "active",
    })) as SampleData[],
    totalRowCount: 500,
  },
};

export const WithChildren: Story = {
  args: {
    paginationMode: "standard",
    isPending: false,
    ToolbarLeft: <div className="text-sm font-semibold">Users</div>,
    children: (
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
        <p className="text-blue-800">
          This is additional content rendered between the toolbar and the table. You can use this for
          filters, notifications, or other contextual information.
        </p>
      </div>
    ),
  },
};

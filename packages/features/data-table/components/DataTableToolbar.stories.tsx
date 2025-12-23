import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  createColumnHelper,
} from "@tanstack/react-table";

import { DataTableProvider } from "../DataTableProvider";
import { DataTableToolbar } from "./DataTableToolbar";

const meta = {
  title: "Features/DataTable/DataTableToolbar",
  component: DataTableToolbar.Root,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "800px", maxWidth: "90vw" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DataTableToolbar.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data type for stories
type Person = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "pending";
};

// Sample data
const samplePeople: Person[] = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "Admin", status: "active" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "Member", status: "active" },
  { id: 3, name: "Bob Wilson", email: "bob@example.com", role: "Member", status: "inactive" },
  { id: 4, name: "Alice Johnson", email: "alice@example.com", role: "Editor", status: "active" },
  { id: 5, name: "Charlie Brown", email: "charlie@example.com", role: "Viewer", status: "pending" },
];

// Column helper
const columnHelper = createColumnHelper<Person>();

// Default story with just the toolbar root
export const Default: Story = {
  render: () => {
    return (
      <DataTableProvider tableIdentifier="toolbar-default">
        <DataTableToolbar.Root>
          <div className="text-sm text-gray-600">Toolbar content goes here</div>
        </DataTableToolbar.Root>
      </DataTableProvider>
    );
  },
};

// Toolbar with SearchBar
export const WithSearchBar: Story = {
  render: () => {
    return (
      <DataTableProvider tableIdentifier="toolbar-search">
        <DataTableToolbar.Root>
          <DataTableToolbar.SearchBar />
        </DataTableToolbar.Root>
      </DataTableProvider>
    );
  },
};

// Toolbar with SearchBar and custom className
export const WithSearchBarCustomClass: Story = {
  render: () => {
    return (
      <DataTableProvider tableIdentifier="toolbar-search-custom">
        <DataTableToolbar.Root>
          <DataTableToolbar.SearchBar className="w-64" />
        </DataTableToolbar.Root>
      </DataTableProvider>
    );
  },
};

// Toolbar with ClearFiltersButton
export const WithClearFiltersButton: Story = {
  render: () => {
    const columns = useMemo(
      () => [
        columnHelper.accessor("name", {
          header: "Name",
          cell: (info) => info.getValue(),
          enableColumnFilter: true,
        }),
        columnHelper.accessor("email", {
          header: "Email",
          cell: (info) => info.getValue(),
          enableColumnFilter: true,
        }),
        columnHelper.accessor("role", {
          header: "Role",
          cell: (info) => info.getValue(),
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
    });

    return (
      <DataTableProvider tableIdentifier="toolbar-clear-filters">
        <DataTableToolbar.Root>
          <DataTableToolbar.ClearFiltersButton table={table} />
          <div className="text-sm text-gray-500">
            Note: The Clear Filters button only appears when filters are active.
          </div>
        </DataTableToolbar.Root>
      </DataTableProvider>
    );
  },
};

// Toolbar with CTA button
export const WithCTA: Story = {
  render: () => {
    const [clickCount, setClickCount] = useState(0);

    return (
      <DataTableProvider tableIdentifier="toolbar-cta">
        <DataTableToolbar.Root>
          <DataTableToolbar.CTA onClick={() => setClickCount(clickCount + 1)}>
            Add New Item
          </DataTableToolbar.CTA>
          {clickCount > 0 && (
            <div className="text-sm text-gray-500">Button clicked {clickCount} times</div>
          )}
        </DataTableToolbar.Root>
      </DataTableProvider>
    );
  },
};

// Toolbar with CTA button variants
export const CTAVariants: Story = {
  render: () => {
    return (
      <DataTableProvider tableIdentifier="toolbar-cta-variants">
        <div className="space-y-4">
          <DataTableToolbar.Root>
            <DataTableToolbar.CTA color="primary">Primary CTA</DataTableToolbar.CTA>
          </DataTableToolbar.Root>
          <DataTableToolbar.Root>
            <DataTableToolbar.CTA color="secondary">Secondary CTA</DataTableToolbar.CTA>
          </DataTableToolbar.Root>
          <DataTableToolbar.Root>
            <DataTableToolbar.CTA color="minimal">Minimal CTA</DataTableToolbar.CTA>
          </DataTableToolbar.Root>
          <DataTableToolbar.Root>
            <DataTableToolbar.CTA color="destructive">Destructive CTA</DataTableToolbar.CTA>
          </DataTableToolbar.Root>
        </div>
      </DataTableProvider>
    );
  },
  parameters: {
    layout: "padded",
  },
};

// Toolbar with CTA with icons
export const CTAWithIcons: Story = {
  render: () => {
    return (
      <DataTableProvider tableIdentifier="toolbar-cta-icons">
        <div className="space-y-4">
          <DataTableToolbar.Root>
            <DataTableToolbar.CTA StartIcon="plus">Add Item</DataTableToolbar.CTA>
          </DataTableToolbar.Root>
          <DataTableToolbar.Root>
            <DataTableToolbar.CTA EndIcon="arrow-right">Continue</DataTableToolbar.CTA>
          </DataTableToolbar.Root>
          <DataTableToolbar.Root>
            <DataTableToolbar.CTA StartIcon="upload" EndIcon="arrow-right">
              Import Data
            </DataTableToolbar.CTA>
          </DataTableToolbar.Root>
        </div>
      </DataTableProvider>
    );
  },
  parameters: {
    layout: "padded",
  },
};

// Complete toolbar with all components
export const CompleteToolbar: Story = {
  render: () => {
    const columns = useMemo(
      () => [
        columnHelper.accessor("name", {
          header: "Name",
          cell: (info) => info.getValue(),
          enableColumnFilter: true,
        }),
        columnHelper.accessor("email", {
          header: "Email",
          cell: (info) => info.getValue(),
          enableColumnFilter: true,
        }),
        columnHelper.accessor("role", {
          header: "Role",
          cell: (info) => info.getValue(),
          enableColumnFilter: true,
        }),
        columnHelper.accessor("status", {
          header: "Status",
          cell: (info) => info.getValue(),
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
    });

    return (
      <DataTableProvider tableIdentifier="toolbar-complete">
        <DataTableToolbar.Root className="grid-cols-[1fr_auto_auto]">
          <DataTableToolbar.SearchBar />
          <DataTableToolbar.ClearFiltersButton table={table} />
          <DataTableToolbar.CTA StartIcon="plus">Add Person</DataTableToolbar.CTA>
        </DataTableToolbar.Root>
      </DataTableProvider>
    );
  },
};

// Toolbar with search and CTA
export const SearchWithCTA: Story = {
  render: () => {
    const [searchValue, setSearchValue] = useState("");

    return (
      <DataTableProvider tableIdentifier="toolbar-search-cta">
        <DataTableToolbar.Root className="grid-cols-[1fr_auto]">
          <DataTableToolbar.SearchBar />
          <DataTableToolbar.CTA StartIcon="plus" color="primary">
            Create New
          </DataTableToolbar.CTA>
        </DataTableToolbar.Root>
      </DataTableProvider>
    );
  },
};

// Toolbar with multiple CTAs
export const MultipleCTAs: Story = {
  render: () => {
    return (
      <DataTableProvider tableIdentifier="toolbar-multiple-ctas">
        <DataTableToolbar.Root className="grid-cols-[1fr_auto_auto_auto]">
          <DataTableToolbar.SearchBar />
          <DataTableToolbar.CTA color="minimal" StartIcon="upload">
            Import
          </DataTableToolbar.CTA>
          <DataTableToolbar.CTA color="minimal" StartIcon="download">
            Export
          </DataTableToolbar.CTA>
          <DataTableToolbar.CTA color="primary" StartIcon="plus">
            Add New
          </DataTableToolbar.CTA>
        </DataTableToolbar.Root>
      </DataTableProvider>
    );
  },
};

// Custom toolbar layout
export const CustomLayout: Story = {
  render: () => {
    const columns = useMemo(
      () => [
        columnHelper.accessor("name", {
          header: "Name",
          cell: (info) => info.getValue(),
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
    });

    return (
      <DataTableProvider tableIdentifier="toolbar-custom-layout">
        <DataTableToolbar.Root className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DataTableToolbar.SearchBar />
            <DataTableToolbar.ClearFiltersButton table={table} />
          </div>
          <div className="flex items-center gap-2">
            <DataTableToolbar.CTA color="minimal" StartIcon="filter">
              Filters
            </DataTableToolbar.CTA>
            <DataTableToolbar.CTA StartIcon="plus">Add Person</DataTableToolbar.CTA>
          </div>
        </DataTableToolbar.Root>
      </DataTableProvider>
    );
  },
};

// Toolbar with custom styling
export const CustomStyling: Story = {
  render: () => {
    return (
      <DataTableProvider tableIdentifier="toolbar-custom-style">
        <DataTableToolbar.Root className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <div className="flex items-center gap-4">
            <DataTableToolbar.SearchBar className="flex-1" />
            <DataTableToolbar.CTA StartIcon="sparkles" color="primary">
              Magic Action
            </DataTableToolbar.CTA>
          </div>
        </DataTableToolbar.Root>
      </DataTableProvider>
    );
  },
};

// Responsive toolbar
export const ResponsiveToolbar: Story = {
  render: () => {
    const columns = useMemo(
      () => [
        columnHelper.accessor("name", {
          header: "Name",
          cell: (info) => info.getValue(),
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
    });

    return (
      <DataTableProvider tableIdentifier="toolbar-responsive">
        <DataTableToolbar.Root className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto]">
          <DataTableToolbar.SearchBar className="w-full md:max-w-48" />
          <DataTableToolbar.ClearFiltersButton table={table} />
          <DataTableToolbar.CTA StartIcon="plus" className="w-full md:w-auto">
            Add New
          </DataTableToolbar.CTA>
        </DataTableToolbar.Root>
      </DataTableProvider>
    );
  },
};

// Minimal toolbar
export const MinimalToolbar: Story = {
  render: () => {
    return (
      <DataTableProvider tableIdentifier="toolbar-minimal">
        <DataTableToolbar.Root>
          <DataTableToolbar.SearchBar />
        </DataTableToolbar.Root>
      </DataTableProvider>
    );
  },
};

// Toolbar states showcase
export const ToolbarStates: Story = {
  render: () => {
    const columns = useMemo(
      () => [
        columnHelper.accessor("name", {
          header: "Name",
          cell: (info) => info.getValue(),
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
    });

    return (
      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Default State</h3>
          <DataTableProvider tableIdentifier="toolbar-state-1">
            <DataTableToolbar.Root className="grid-cols-[1fr_auto_auto]">
              <DataTableToolbar.SearchBar />
              <DataTableToolbar.ClearFiltersButton table={table} />
              <DataTableToolbar.CTA StartIcon="plus">Add Item</DataTableToolbar.CTA>
            </DataTableToolbar.Root>
          </DataTableProvider>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">With Loading CTA</h3>
          <DataTableProvider tableIdentifier="toolbar-state-2">
            <DataTableToolbar.Root className="grid-cols-[1fr_auto]">
              <DataTableToolbar.SearchBar />
              <DataTableToolbar.CTA StartIcon="plus" loading>
                Adding...
              </DataTableToolbar.CTA>
            </DataTableToolbar.Root>
          </DataTableProvider>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">With Disabled CTA</h3>
          <DataTableProvider tableIdentifier="toolbar-state-3">
            <DataTableToolbar.Root className="grid-cols-[1fr_auto]">
              <DataTableToolbar.SearchBar />
              <DataTableToolbar.CTA StartIcon="plus" disabled>
                Add Item
              </DataTableToolbar.CTA>
            </DataTableToolbar.Root>
          </DataTableProvider>
        </div>
      </div>
    );
  },
  parameters: {
    layout: "padded",
  },
};

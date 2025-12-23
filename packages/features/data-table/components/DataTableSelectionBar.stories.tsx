import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, useMemo, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  type RowSelectionState,
} from "@tanstack/react-table";

import { DataTableSelectionBar, type ActionItem } from "./DataTableSelectionBar";

const meta = {
  title: "Features/DataTable/DataTableSelectionBar",
  component: DataTableSelectionBar.Root,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DataTableSelectionBar.Root>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data type
type Person = {
  id: number;
  name: string;
  email: string;
  role: string;
};

// Sample data
const samplePeople: Person[] = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "Admin" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "Member" },
  { id: 3, name: "Bob Wilson", email: "bob@example.com", role: "Member" },
  { id: 4, name: "Alice Johnson", email: "alice@example.com", role: "Editor" },
  { id: 5, name: "Charlie Brown", email: "charlie@example.com", role: "Viewer" },
];

const personColumnHelper = createColumnHelper<Person>();

// Helper component to create a table with row selection
function SelectableTableWrapper({ children }: { children: (table: any) => React.ReactNode }) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({
    "0": true,
    "1": true,
    "2": true,
  });

  const columns = useMemo(
    () => [
      personColumnHelper.display({
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
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
    ],
    []
  );

  const table = useReactTable({
    data: samplePeople,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
  });

  return <>{children(table)}</>;
}

export const Default: Story = {
  render: () => (
    <SelectableTableWrapper>
      {(table) => (
        <div style={{ width: "800px", maxWidth: "90vw" }}>
          <div className="mb-4 rounded-lg border p-4">
            <p className="text-sm mb-2">Selected rows: {table.getSelectedRowModel().rows.length}</p>
            <div className="border-subtle overflow-hidden rounded-lg border">
              <table className="w-full">
                <thead className="bg-subtle">
                  <tr>
                    {table.getFlatHeaders().map((header) => (
                      <th key={header.id} className="border-subtle border-b px-4 py-2 text-left">
                        {header.isPlaceholder ? null : header.column.columnDef.header?.(header.getContext())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-subtle border-b last:border-0">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2">
                          {cell.column.columnDef.cell?.(cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {table.getSelectedRowModel().rows.length > 0 && (
            <DataTableSelectionBar.Root>
              <span className="text-sm font-medium">
                {table.getSelectedRowModel().rows.length} selected
              </span>
              <DataTableSelectionBar.Button icon="trash-2" color="destructive">
                Delete
              </DataTableSelectionBar.Button>
            </DataTableSelectionBar.Root>
          )}
        </div>
      )}
    </SelectableTableWrapper>
  ),
};

export const WithMultipleActions: Story = {
  render: () => (
    <SelectableTableWrapper>
      {(table) => (
        <div style={{ width: "800px", maxWidth: "90vw" }}>
          <div className="mb-4 rounded-lg border p-4">
            <p className="text-sm mb-2">Selected rows: {table.getSelectedRowModel().rows.length}</p>
            <div className="border-subtle overflow-hidden rounded-lg border">
              <table className="w-full">
                <thead className="bg-subtle">
                  <tr>
                    {table.getFlatHeaders().map((header) => (
                      <th key={header.id} className="border-subtle border-b px-4 py-2 text-left">
                        {header.isPlaceholder ? null : header.column.columnDef.header?.(header.getContext())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-subtle border-b last:border-0">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2">
                          {cell.column.columnDef.cell?.(cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {table.getSelectedRowModel().rows.length > 0 && (
            <DataTableSelectionBar.Root>
              <span className="text-sm font-medium">
                {table.getSelectedRowModel().rows.length} selected
              </span>
              <DataTableSelectionBar.Button
                icon="mail"
                color="secondary"
                onClick={() => alert("Send email to selected users")}>
                Email
              </DataTableSelectionBar.Button>
              <DataTableSelectionBar.Button
                icon="download"
                color="secondary"
                onClick={() => alert("Export selected users")}>
                Export
              </DataTableSelectionBar.Button>
              <DataTableSelectionBar.Button
                icon="copy"
                color="secondary"
                onClick={() => alert("Duplicate selected users")}>
                Duplicate
              </DataTableSelectionBar.Button>
              <DataTableSelectionBar.Button
                icon="trash-2"
                color="destructive"
                onClick={() => alert("Delete selected users")}>
                Delete
              </DataTableSelectionBar.Button>
            </DataTableSelectionBar.Root>
          )}
        </div>
      )}
    </SelectableTableWrapper>
  ),
};

export const WithCustomContent: Story = {
  render: () => (
    <SelectableTableWrapper>
      {(table) => (
        <div style={{ width: "800px", maxWidth: "90vw" }}>
          <div className="mb-4 rounded-lg border p-4">
            <p className="text-sm mb-2">Selected rows: {table.getSelectedRowModel().rows.length}</p>
            <div className="border-subtle overflow-hidden rounded-lg border">
              <table className="w-full">
                <thead className="bg-subtle">
                  <tr>
                    {table.getFlatHeaders().map((header) => (
                      <th key={header.id} className="border-subtle border-b px-4 py-2 text-left">
                        {header.isPlaceholder ? null : header.column.columnDef.header?.(header.getContext())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-subtle border-b last:border-0">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2">
                          {cell.column.columnDef.cell?.(cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {table.getSelectedRowModel().rows.length > 0 && (
            <DataTableSelectionBar.Root>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {table.getSelectedRowModel().rows.length} items
                </span>
                <span className="text-subtle text-xs">
                  ({table.getSelectedRowModel().rows.map((r) => r.original.name).join(", ")})
                </span>
              </div>
              <DataTableSelectionBar.Button
                icon="x"
                color="minimal"
                onClick={() => table.resetRowSelection()}>
                Clear Selection
              </DataTableSelectionBar.Button>
            </DataTableSelectionBar.Root>
          )}
        </div>
      )}
    </SelectableTableWrapper>
  ),
};

export const SingleSelection: Story = {
  render: () => {
    function SingleSelectionWrapper() {
      const [rowSelection, setRowSelection] = useState<RowSelectionState>({ "0": true });

      const columns = useMemo(
        () => [
          personColumnHelper.display({
            id: "select",
            header: "",
            cell: ({ row }) => (
              <input
                type="radio"
                name="selection"
                checked={row.getIsSelected()}
                onChange={row.getToggleSelectedHandler()}
              />
            ),
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
        ],
        []
      );

      const table = useReactTable({
        data: samplePeople,
        columns,
        getCoreRowModel: getCoreRowModel(),
        state: {
          rowSelection,
        },
        onRowSelectionChange: setRowSelection,
        enableRowSelection: true,
        enableMultiRowSelection: false,
      });

      return (
        <div style={{ width: "800px", maxWidth: "90vw" }}>
          <div className="mb-4 rounded-lg border p-4">
            <div className="border-subtle overflow-hidden rounded-lg border">
              <table className="w-full">
                <thead className="bg-subtle">
                  <tr>
                    {table.getFlatHeaders().map((header) => (
                      <th key={header.id} className="border-subtle border-b px-4 py-2 text-left">
                        {header.isPlaceholder ? null : header.column.columnDef.header?.(header.getContext())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-subtle border-b last:border-0">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2">
                          {cell.column.columnDef.cell?.(cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {table.getSelectedRowModel().rows.length > 0 && (
            <DataTableSelectionBar.Root>
              <span className="text-sm font-medium">
                {table.getSelectedRowModel().rows[0].original.name} selected
              </span>
              <DataTableSelectionBar.Button
                icon="pencil"
                color="primary"
                onClick={() => alert("Edit user")}>
                Edit
              </DataTableSelectionBar.Button>
              <DataTableSelectionBar.Button
                icon="trash-2"
                color="destructive"
                onClick={() => alert("Delete user")}>
                Delete
              </DataTableSelectionBar.Button>
            </DataTableSelectionBar.Root>
          )}
        </div>
      );
    }

    return <SingleSelectionWrapper />;
  },
};

export const ResponsiveButtons: Story = {
  render: () => (
    <SelectableTableWrapper>
      {(table) => (
        <div style={{ width: "100%", maxWidth: "90vw" }}>
          <div className="mb-4 rounded-lg border p-4">
            <p className="text-subtle text-xs mb-2">
              Note: Resize your browser to see how the buttons adapt - they show only icons on mobile and
              icons with text on larger screens.
            </p>
            <p className="text-sm mb-2">Selected rows: {table.getSelectedRowModel().rows.length}</p>
            <div className="border-subtle overflow-hidden rounded-lg border">
              <table className="w-full">
                <thead className="bg-subtle">
                  <tr>
                    {table.getFlatHeaders().map((header) => (
                      <th key={header.id} className="border-subtle border-b px-4 py-2 text-left">
                        {header.isPlaceholder ? null : header.column.columnDef.header?.(header.getContext())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-subtle border-b last:border-0">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2">
                          {cell.column.columnDef.cell?.(cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {table.getSelectedRowModel().rows.length > 0 && (
            <DataTableSelectionBar.Root>
              <span className="text-sm font-medium">
                {table.getSelectedRowModel().rows.length} selected
              </span>
              <DataTableSelectionBar.Button icon="mail" color="secondary">
                Send Email
              </DataTableSelectionBar.Button>
              <DataTableSelectionBar.Button icon="download" color="secondary">
                Export CSV
              </DataTableSelectionBar.Button>
              <DataTableSelectionBar.Button icon="user-plus" color="secondary">
                Add to Group
              </DataTableSelectionBar.Button>
              <DataTableSelectionBar.Button icon="trash-2" color="destructive">
                Delete Selected
              </DataTableSelectionBar.Button>
            </DataTableSelectionBar.Root>
          )}
        </div>
      )}
    </SelectableTableWrapper>
  ),
};

export const BarOnly: Story = {
  render: () => (
    <div className="relative" style={{ width: "800px", height: "200px", maxWidth: "90vw" }}>
      <DataTableSelectionBar.Root>
        <span className="text-sm font-medium">3 items selected</span>
        <DataTableSelectionBar.Button icon="mail" color="secondary">
          Email
        </DataTableSelectionBar.Button>
        <DataTableSelectionBar.Button icon="download" color="secondary">
          Export
        </DataTableSelectionBar.Button>
        <DataTableSelectionBar.Button icon="trash-2" color="destructive">
          Delete
        </DataTableSelectionBar.Button>
      </DataTableSelectionBar.Root>
    </div>
  ),
};

export const MinimalActions: Story = {
  render: () => (
    <SelectableTableWrapper>
      {(table) => (
        <div style={{ width: "800px", maxWidth: "90vw" }}>
          <div className="mb-4 rounded-lg border p-4">
            <p className="text-sm mb-2">Selected rows: {table.getSelectedRowModel().rows.length}</p>
            <div className="border-subtle overflow-hidden rounded-lg border">
              <table className="w-full">
                <thead className="bg-subtle">
                  <tr>
                    {table.getFlatHeaders().map((header) => (
                      <th key={header.id} className="border-subtle border-b px-4 py-2 text-left">
                        {header.isPlaceholder ? null : header.column.columnDef.header?.(header.getContext())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-subtle border-b last:border-0">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2">
                          {cell.column.columnDef.cell?.(cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {table.getSelectedRowModel().rows.length > 0 && (
            <DataTableSelectionBar.Root>
              <span className="text-sm font-medium">
                {table.getSelectedRowModel().rows.length} selected
              </span>
              <DataTableSelectionBar.Button
                icon="trash-2"
                color="destructive"
                onClick={() => alert("Delete selected")}>
                Delete
              </DataTableSelectionBar.Button>
            </DataTableSelectionBar.Root>
          )}
        </div>
      )}
    </SelectableTableWrapper>
  ),
};

export const WithButtonVariants: Story = {
  render: () => (
    <SelectableTableWrapper>
      {(table) => (
        <div style={{ width: "800px", maxWidth: "90vw" }}>
          <div className="mb-4 rounded-lg border p-4">
            <p className="text-sm mb-2">Selected rows: {table.getSelectedRowModel().rows.length}</p>
            <div className="border-subtle overflow-hidden rounded-lg border">
              <table className="w-full">
                <thead className="bg-subtle">
                  <tr>
                    {table.getFlatHeaders().map((header) => (
                      <th key={header.id} className="border-subtle border-b px-4 py-2 text-left">
                        {header.isPlaceholder ? null : header.column.columnDef.header?.(header.getContext())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-subtle border-b last:border-0">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2">
                          {cell.column.columnDef.cell?.(cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {table.getSelectedRowModel().rows.length > 0 && (
            <DataTableSelectionBar.Root>
              <span className="text-sm font-medium">
                {table.getSelectedRowModel().rows.length} selected
              </span>
              <DataTableSelectionBar.Button icon="check" color="primary">
                Approve
              </DataTableSelectionBar.Button>
              <DataTableSelectionBar.Button icon="pencil" color="secondary">
                Edit
              </DataTableSelectionBar.Button>
              <DataTableSelectionBar.Button icon="copy" color="minimal">
                Duplicate
              </DataTableSelectionBar.Button>
              <DataTableSelectionBar.Button icon="trash-2" color="destructive">
                Delete
              </DataTableSelectionBar.Button>
            </DataTableSelectionBar.Root>
          )}
        </div>
      )}
    </SelectableTableWrapper>
  ),
};

import { type Column, getCoreRowModel, type Table, useReactTable } from "@tanstack/react-table";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useMemo } from "react";
import { vi } from "vitest";
import { ColumnVisibilityButton } from "./ColumnVisibilityButton";

let tableRef: Table<{ a: number; b: number; c: number }> | null = null;

const TestWrapper = () => {
  const data = useMemo(() => [{ a: 1, b: 2, c: 3 }], []);
  const columns = useMemo(
    () => [
      { accessorKey: "a", header: "A" },
      { accessorKey: "b", header: "B", enableHiding: true },
      { accessorKey: "c", header: "C", enableHiding: true },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    initialState: { columnVisibility: { b: false, c: false } },
  });

  useEffect(() => {
    tableRef = table;
  }, [table]);

  return <ColumnVisibilityButton table={table} />;
};

describe("ColumnVisibilityButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableRef = null;
  });

  it("show_all_columns sets all columns visible", async () => {
    render(<TestWrapper />);

    fireEvent.click(screen.getByText("display"));

    const showAll = await screen.findByText("show_all_columns");
    fireEvent.click(showAll);

    await waitFor(() => {
      expect(tableRef).not.toBeNull();
      const allVisible = tableRef!
        .getAllLeafColumns()
        .every((col: Column<{ a: number; b: number; c: number }, unknown>) => col.getIsVisible());
      expect(allVisible).toBe(true);
    });
  });
});

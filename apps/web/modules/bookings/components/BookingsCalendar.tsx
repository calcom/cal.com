"use client";

import type { Table as ReactTable } from "@tanstack/react-table";
import { useMemo } from "react";

import { DataTableFilters, DataTableSegment } from "@calcom/features/data-table";

import type { RowData, BookingListingStatus } from "../types";
import { WeekCalendarView } from "./WeekCalendarView";

type BookingsCalendarViewProps = {
  status: BookingListingStatus;
  table: ReactTable<RowData>;
};

export function BookingsCalendar({ table }: BookingsCalendarViewProps) {
  const { rows } = table.getRowModel();

  const bookings = useMemo(() => {
    return rows
      .filter((row) => row.original.type === "data")
      .map((row) => (row.original.type === "data" ? row.original.booking : null))
      .filter((booking): booking is NonNullable<typeof booking> => booking !== null);
  }, [rows]);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DataTableFilters.FilterBar table={table} />
        </div>

        <div className="flex items-center gap-2">
          <DataTableFilters.ClearFiltersButton />
          <DataTableSegment.SaveButton />
          <DataTableSegment.Select />
        </div>
      </div>
      <WeekCalendarView bookings={bookings} />
    </>
  );
}

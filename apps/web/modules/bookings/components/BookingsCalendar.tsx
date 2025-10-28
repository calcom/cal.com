"use client";

import type { Table as ReactTable } from "@tanstack/react-table";

import { DataTableFilters, DataTableSegment } from "@calcom/features/data-table";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

import type { RowData, BookingListingStatus } from "../types";

type BookingsCalendarViewProps = {
  status: BookingListingStatus;
  table: ReactTable<RowData>;
};

export function BookingsCalendar({ table }: BookingsCalendarViewProps) {
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
      <div className="flex items-center justify-center pt-2 xl:pt-0">
        <EmptyScreen Icon="calendar" headline="Calendar view" description="Calendar view is coming soon." />
      </div>
    </>
  );
}

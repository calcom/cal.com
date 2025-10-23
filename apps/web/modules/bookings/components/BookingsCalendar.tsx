"use client";

import type { Table as ReactTable } from "@tanstack/react-table";
import { useMemo, useCallback } from "react";

import {
  DataTableFilters,
  DataTableSegment,
  useDataTable,
  useFilterValue,
  ZDateRangeFilterValue,
  ColumnFilterType,
} from "@calcom/features/data-table";
import { CUSTOM_PRESET } from "@calcom/features/data-table/lib/dateRange";

import type { RowData, BookingListingStatus } from "../types";
import { BookingsCalendarView } from "./BookingsCalendarView";

type BookingsCalendarViewProps = {
  status: BookingListingStatus;
  table: ReactTable<RowData>;
};

const COLUMN_IDS_TO_HIDE = ["dateRange"];

export function BookingsCalendar({ table }: BookingsCalendarViewProps) {
  const { rows } = table.getRowModel();
  const { updateFilter } = useDataTable();
  const dateRange = useFilterValue("dateRange", ZDateRangeFilterValue)?.data;

  const bookings = useMemo(() => {
    return rows
      .filter((row) => row.original.type === "data")
      .map((row) => (row.original.type === "data" ? row.original.booking : null))
      .filter((booking): booking is NonNullable<typeof booking> => booking !== null);
  }, [rows]);

  const handleWeekChange = useCallback(
    (startDate: Date, endDate: Date) => {
      if (!dateRange) {
        return;
      }

      const rangeStart = dateRange.startDate ? new Date(dateRange.startDate) : null;
      const rangeEnd = dateRange.endDate ? new Date(dateRange.endDate) : null;

      const needsStartUpdate = !rangeStart || startDate < rangeStart;
      const needsEndUpdate = !rangeEnd || endDate > rangeEnd;

      if (!needsStartUpdate && !needsEndUpdate) {
        return;
      }

      const newStartDate = needsStartUpdate ? startDate : rangeStart;
      const newEndDate = needsEndUpdate ? endDate : rangeEnd;

      updateFilter("dateRange", {
        type: ColumnFilterType.DATE_RANGE,
        data: {
          startDate: newStartDate.toISOString(),
          endDate: newEndDate.toISOString(),
          preset: CUSTOM_PRESET.value,
        },
      });
    },
    [dateRange, updateFilter]
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DataTableFilters.FilterBar table={table} columnIdsToHide={COLUMN_IDS_TO_HIDE} />
        </div>

        <div className="flex items-center gap-2">
          <DataTableFilters.ClearFiltersButton />
          <DataTableSegment.SaveButton />
          <DataTableSegment.Select />
        </div>
      </div>
      <BookingsCalendarView bookings={bookings} onWeekChange={handleWeekChange} />
    </>
  );
}

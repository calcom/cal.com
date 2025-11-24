"use client";

import type { Table as ReactTable } from "@tanstack/react-table";
import { useCallback } from "react";

import dayjs from "@calcom/dayjs";
import {
  DataTableFilters,
  DataTableSegment,
  useDataTable,
  ColumnFilterType,
} from "@calcom/features/data-table";
import { CUSTOM_PRESET } from "@calcom/features/data-table/lib/dateRange";

import type { RowData, BookingListingStatus, BookingOutput } from "../types";
import { BookingsCalendarView } from "./BookingsCalendarView";

type BookingsCalendarProps = {
  status: BookingListingStatus;
  table: ReactTable<RowData>;
  isPending?: boolean;
  currentWeekStart: dayjs.Dayjs;
  setCurrentWeekStart: (
    value: dayjs.Dayjs | ((old: dayjs.Dayjs) => dayjs.Dayjs | null) | null
  ) => Promise<URLSearchParams>;
  bookings: BookingOutput[];
  ErrorView?: React.ReactNode;
  hasError?: boolean;
};

const COLUMN_IDS_TO_HIDE = ["dateRange"];

export function BookingsCalendar({
  table,
  isPending = false,
  currentWeekStart,
  setCurrentWeekStart,
  bookings,
  ErrorView,
  hasError,
}: BookingsCalendarProps) {
  const { updateFilter } = useDataTable();

  const handleWeekStartChange = useCallback(
    (newWeekStart: dayjs.Dayjs) => {
      setCurrentWeekStart(newWeekStart);

      // Always set the date range to match the current week exactly
      const startDate = newWeekStart.toDate();
      const endDate = newWeekStart.add(6, "day").toDate();

      updateFilter("dateRange", {
        type: ColumnFilterType.DATE_RANGE,
        data: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          preset: CUSTOM_PRESET.value,
        },
      });
    },
    [updateFilter, setCurrentWeekStart]
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
      {hasError && ErrorView ? (
        ErrorView
      ) : (
        <BookingsCalendarView
          bookings={bookings}
          currentWeekStart={currentWeekStart}
          onWeekStartChange={handleWeekStartChange}
          isPending={isPending}
        />
      )}
    </>
  );
}

"use client";

import type { Table as ReactTable } from "@tanstack/react-table";

import dayjs from "@calcom/dayjs";
import { DataTableFilters } from "@calcom/features/data-table";

import type { RowData, BookingListingStatus, BookingOutput } from "../types";
import { BookingsCalendarView } from "./BookingsCalendarView";
import { ViewToggleButton } from "./ViewToggleButton";

type BookingsCalendarProps = {
  status: BookingListingStatus;
  table: ReactTable<RowData>;
  showFilterBar: boolean;
  isPending?: boolean;
  currentWeekStart: dayjs.Dayjs;
  setCurrentWeekStart: (
    value: dayjs.Dayjs | ((old: dayjs.Dayjs) => dayjs.Dayjs | null) | null
  ) => Promise<URLSearchParams>;
  bookings: BookingOutput[];
  ErrorView?: React.ReactNode;
  hasError?: boolean;
  userWeekStart?: number;
};

export function BookingsCalendar({
  table,
  showFilterBar,
  isPending = false,
  currentWeekStart,
  setCurrentWeekStart,
  bookings,
  ErrorView,
  hasError,
  userWeekStart = 0,
}: BookingsCalendarProps) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showFilterBar && <DataTableFilters.FilterBar table={table} />}
        </div>

        <div className="flex items-center gap-2">
          <ViewToggleButton />
        </div>
      </div>
      {hasError && ErrorView ? (
        ErrorView
      ) : (
        <BookingsCalendarView
          bookings={bookings}
          currentWeekStart={currentWeekStart}
          onWeekStartChange={setCurrentWeekStart}
          isPending={isPending}
          userWeekStart={userWeekStart}
        />
      )}
    </>
  );
}

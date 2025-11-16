"use client";

import type { Table as ReactTable } from "@tanstack/react-table";
import { createParser, useQueryState } from "nuqs";
import { useMemo, useCallback } from "react";

import dayjs from "@calcom/dayjs";
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

const weekStartParser = createParser({
  parse: (value: string) => {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.startOf("week") : dayjs().startOf("week");
  },
  serialize: (value: dayjs.Dayjs) => value.format("YYYY-MM-DD"),
});

export function BookingsCalendar({ table }: BookingsCalendarViewProps) {
  const { rows } = table.getRowModel();
  const { updateFilter } = useDataTable();
  const dateRange = useFilterValue("dateRange", ZDateRangeFilterValue)?.data;

  const [currentWeekStart, setCurrentWeekStart] = useQueryState(
    "weekStart",
    weekStartParser.withDefault(dayjs().startOf("week"))
  );

  const bookings = useMemo(() => {
    return rows
      .filter((row) => row.original.type === "data")
      .map((row) => (row.original.type === "data" ? row.original.booking : null))
      .filter((booking): booking is NonNullable<typeof booking> => booking !== null);
  }, [rows]);

  const handleWeekStartChange = useCallback(
    (newWeekStart: dayjs.Dayjs) => {
      setCurrentWeekStart(newWeekStart);

      const startDate = newWeekStart.toDate();
      const endDate = newWeekStart.add(6, "day").toDate();

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
    [dateRange, updateFilter, setCurrentWeekStart]
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
      <BookingsCalendarView
        bookings={bookings}
        currentWeekStart={currentWeekStart}
        onWeekStartChange={handleWeekStartChange}
      />
    </>
  );
}

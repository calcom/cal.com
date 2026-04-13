import { DEFAULT_PRESET, getDateRangeFromPreset } from "@calcom/features/data-table/lib/dateRange";
import { ColumnFilterType } from "@calcom/features/data-table/lib/types";
import type { DateRangeFilterValue } from "@calcom/features/data-table/lib/types";
import { useEffect, useMemo, useRef } from "react";
import { useDataTable } from "~/data-table/hooks/useDataTable";
import type { BookingListingStatus } from "../types";

const DATE_RANGE_COLUMN_ID = "dateRange";

/**
 * Auto-applies a default "Last 7 days" date range filter when viewing past bookings.
 * This reduces the query window on the Booking table for better performance.
 *
 * The filter is only applied once when first navigating to the past tab,
 * and only if the user doesn't already have a date range filter set.
 * Users can freely change or remove the filter after it's applied.
 *
 * Returns `fallbackDateRange` — a synchronous 7-day date range that callers
 * can use as a query fallback before the async UI filter has been applied.
 */
export function usePastBookingsDefaultDateRange(status: BookingListingStatus): {
  fallbackDateRange: { startDate: string; endDate: string } | undefined;
} {
  const { activeFilters, updateFilter } = useDataTable();
  const hasAppliedDefault = useRef(false);

  // Synchronous 7-day fallback: computed during render so the very first
  // query on the past tab always includes a date restriction, even before
  // the async useEffect below has fired.
  const fallbackDateRange = useMemo(() => {
    if (status !== "past") return undefined;
    const { startDate, endDate } = getDateRangeFromPreset(DEFAULT_PRESET.value);
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }, [status]);

  useEffect(() => {
    if (status !== "past") {
      hasAppliedDefault.current = false;
      return;
    }

    if (hasAppliedDefault.current) return;

    const hasDateRangeFilter = activeFilters.some((filter) => filter.f === DATE_RANGE_COLUMN_ID);
    if (hasDateRangeFilter) {
      hasAppliedDefault.current = true;
      return;
    }

    const { startDate, endDate } = getDateRangeFromPreset(DEFAULT_PRESET.value);
    const dateRangeValue: DateRangeFilterValue = {
      type: ColumnFilterType.DATE_RANGE,
      data: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        preset: DEFAULT_PRESET.value,
      },
    };

    updateFilter(DATE_RANGE_COLUMN_ID, dateRangeValue);
    hasAppliedDefault.current = true;
  }, [status, activeFilters, updateFilter]);

  return { fallbackDateRange };
}

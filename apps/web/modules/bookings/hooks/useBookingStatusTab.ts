import { useSearchParams, usePathname } from "next/navigation";
import { useMemo } from "react";

import { DEFAULT_PRESET, getDateRangeFromPreset } from "@calcom/features/data-table/lib/dateRange";
import { ColumnFilterType } from "@calcom/features/data-table/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export function useBookingStatusTab() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const tabOptions = useMemo(() => {
    const queryString = searchParams?.toString() || "";

    // Build a query string with the dateRange filter stripped out.
    // The past bookings tab auto-applies a dateRange filter, and since we
    // carry all URL params to every tab href, it would leak to other tabs
    // and hide bookings (e.g. upcoming bookings filtered to past dates).
    const queryStringWithoutDateRange = (() => {
      if (!searchParams) return "";
      const params = new URLSearchParams(searchParams.toString());
      const activeFilters = params.getAll("activeFilters");
      const hasDateRange = activeFilters.some((filter) => {
        try {
          const decoded = decodeURIComponent(filter);
          return JSON.parse(decoded).f === "dateRange";
        } catch {
          return false;
        }
      });
      if (!hasDateRange) return queryString;
      params.delete("activeFilters");
      for (const filter of activeFilters) {
        try {
          const decoded = decodeURIComponent(filter);
          if (JSON.parse(decoded).f !== "dateRange") {
            params.append("activeFilters", filter);
          }
        } catch {
          params.append("activeFilters", filter);
        }
      }
      return params.toString();
    })();

    const baseTabConfigs = [
      {
        value: "upcoming",
        label: "upcoming",
        path: "/bookings/upcoming",
        dataTestId: "upcoming",
      },
      {
        value: "unconfirmed",
        label: "unconfirmed",
        path: "/bookings/unconfirmed",
        dataTestId: "unconfirmed",
      },
      {
        value: "recurring",
        label: "recurring",
        path: "/bookings/recurring",
        dataTestId: "recurring",
      },
      {
        value: "past",
        label: "past",
        path: "/bookings/past",
        dataTestId: "past",
      },
      {
        value: "cancelled",
        label: "cancelled",
        path: "/bookings/cancelled",
        dataTestId: "cancelled",
      },
    ];

    // Build a query string that ensures the past tab always has a default
    // dateRange filter in the URL. This is critical because nuqs hydrates
    // activeFilters from URL params on navigation — if the URL doesn't
    // include the dateRange param, the filter pill won't appear.
    const queryStringWithDefaultDateRange = (() => {
      if (!searchParams) return "";
      const params = new URLSearchParams(searchParams.toString());
      const activeFiltersParams = params.getAll("activeFilters");
      const hasDateRange = activeFiltersParams.some((filter) => {
        try {
          const decoded = decodeURIComponent(filter);
          return JSON.parse(decoded).f === "dateRange";
        } catch {
          return false;
        }
      });
      if (hasDateRange) return queryString; // Already has dateRange, keep as-is

      // Add default 7-day dateRange filter
      const { startDate, endDate } = getDateRangeFromPreset(DEFAULT_PRESET.value);
      const defaultFilter = JSON.stringify({
        f: "dateRange",
        v: {
          type: ColumnFilterType.DATE_RANGE,
          data: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            preset: DEFAULT_PRESET.value,
          },
        },
      });
      // nuqs parseAsArrayOf splits on literal commas in the decoded param value.
      // Pre-encode commas as %2C so URLSearchParams.toString() produces %252C,
      // matching nuqs's own serialization format.
      const nuqsEncodedFilter = defaultFilter.replace(/,/g, "%2C");
      params.append("activeFilters", nuqsEncodedFilter);
      return params.toString();
    })();

    return baseTabConfigs.map((tabConfig) => {
      const qs = tabConfig.value === "past" ? queryStringWithDefaultDateRange : queryStringWithoutDateRange;
      return {
        value: tabConfig.value,
        label: t(tabConfig.label),
        dataTestId: tabConfig.dataTestId,
        href: qs ? `${tabConfig.path}?${qs}` : tabConfig.path,
      };
    });
  }, [searchParams, t]);

  const currentTab = useMemo(() => {
    const pathMatch = pathname?.match(/\/bookings\/(\w+)/);
    return pathMatch?.[1] || "upcoming";
  }, [pathname]);

  return {
    currentTab,
    tabOptions,
  };
}

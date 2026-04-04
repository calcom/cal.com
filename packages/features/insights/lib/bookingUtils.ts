import { ColumnFilterType } from "@calcom/features/data-table/lib/types";
import { type ColumnFilter } from "@calcom/features/data-table/lib/types";
import { isDateRangeFilterValue } from "@calcom/features/data-table/lib/utils";
import type { FilterType } from "@calcom/types/data-table";

export function extractDateRangeFromColumnFilters(columnFilters?: ColumnFilter[]) {
  if (!columnFilters) throw new Error("No date range filter found");

  for (const filter of columnFilters) {
    if ((filter.id === "startTime" || filter.id === "createdAt") && isDateRangeFilterValue(filter.value)) {
      const dateFilter = filter.value as Extract<ColumnFilter["value"], { type: Extract<FilterType, "dr"> }>;
      if (dateFilter.data.startDate && dateFilter.data.endDate) {
        return {
          startDate: dateFilter.data.startDate,
          endDate: dateFilter.data.endDate,
          dateTarget: filter.id,
        };
      }
    }
  }

  throw new Error("No date range filter found");
}

export function replaceDateRangeColumnFilter({
  columnFilters,
  newStartDate,
  newEndDate,
}: {
  columnFilters?: ColumnFilter[];
  newStartDate: string;
  newEndDate: string;
}) {
  if (!columnFilters) {
    return undefined;
  }

  return columnFilters.map((filter) => {
    if ((filter.id === "startTime" || filter.id === "createdAt") && isDateRangeFilterValue(filter.value)) {
      return {
        id: filter.id,
        value: {
          type: ColumnFilterType.DATE_RANGE,
          data: {
            startDate: newStartDate,
            endDate: newEndDate,
            preset: filter.value.data.preset,
          },
        },
      } satisfies ColumnFilter;
    } else {
      return filter;
    }
  });
}

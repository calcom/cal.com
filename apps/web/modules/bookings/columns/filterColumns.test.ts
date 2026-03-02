import { describe, expect, it } from "vitest";

import { ColumnFilterType } from "@calcom/features/data-table";
import type { ColumnFilterMeta } from "@calcom/features/data-table";

import { getFilterColumnVisibility, buildFilterColumns } from "./filterColumns";

function getFilterMeta(
  columns: ReturnType<typeof buildFilterColumns>,
  id: string
): ColumnFilterMeta | undefined {
  const col = columns.find((c) => c.id === id);
  return col?.meta?.filter;
}

describe("getFilterColumnVisibility", () => {
  it("returns visibility state with all filter columns hidden", () => {
    const visibility = getFilterColumnVisibility();

    expect(visibility.eventTypeId).toBe(false);
    expect(visibility.teamId).toBe(false);
    expect(visibility.userId).toBe(false);
    expect(visibility.attendeeName).toBe(false);
    expect(visibility.attendeeEmail).toBe(false);
    expect(visibility.dateRange).toBe(false);
    expect(visibility.bookingUid).toBe(false);
  });

  it("returns exactly 7 entries", () => {
    const visibility = getFilterColumnVisibility();
    expect(Object.keys(visibility)).toHaveLength(7);
  });
});

describe("buildFilterColumns", () => {
  const mockT = (key: string) => key;
  const defaultParams = {
    t: mockT,
    permissions: { canReadOthersBookings: true },
    status: "upcoming",
  };

  it("returns 7 filter columns", () => {
    const columns = buildFilterColumns(defaultParams);
    expect(columns).toHaveLength(7);
  });

  it("creates eventTypeId column with MULTI_SELECT filter", () => {
    const columns = buildFilterColumns(defaultParams);
    const filter = getFilterMeta(columns, "eventTypeId");
    expect(filter).toBeDefined();
    expect(filter?.type).toBe(ColumnFilterType.MULTI_SELECT);
  });

  it("creates teamId column with MULTI_SELECT filter", () => {
    const columns = buildFilterColumns(defaultParams);
    const filter = getFilterMeta(columns, "teamId");
    expect(filter).toBeDefined();
    expect(filter?.type).toBe(ColumnFilterType.MULTI_SELECT);
  });

  it("creates userId column with MULTI_SELECT filter", () => {
    const columns = buildFilterColumns(defaultParams);
    const filter = getFilterMeta(columns, "userId");
    expect(filter).toBeDefined();
    expect(filter?.type).toBe(ColumnFilterType.MULTI_SELECT);
  });

  it("creates attendeeName column with TEXT filter", () => {
    const columns = buildFilterColumns(defaultParams);
    const filter = getFilterMeta(columns, "attendeeName");
    expect(filter).toBeDefined();
    expect(filter?.type).toBe(ColumnFilterType.TEXT);
  });

  it("creates attendeeEmail column with TEXT filter", () => {
    const columns = buildFilterColumns(defaultParams);
    const filter = getFilterMeta(columns, "attendeeEmail");
    expect(filter).toBeDefined();
    expect(filter?.type).toBe(ColumnFilterType.TEXT);
  });

  it("creates dateRange column with DATE_RANGE filter", () => {
    const columns = buildFilterColumns(defaultParams);
    const filter = getFilterMeta(columns, "dateRange");
    expect(filter).toBeDefined();
    expect(filter?.type).toBe(ColumnFilterType.DATE_RANGE);
  });

  it("creates bookingUid column with TEXT filter and equals-only operator", () => {
    const columns = buildFilterColumns(defaultParams);
    const filter = getFilterMeta(columns, "bookingUid");
    expect(filter).toBeDefined();
    expect(filter?.type).toBe(ColumnFilterType.TEXT);
    if (filter && filter.type === ColumnFilterType.TEXT) {
      expect(filter.textOptions?.allowedOperators).toEqual(["equals"]);
    }
  });

  it("sets dateRange to 'future' for upcoming status", () => {
    const columns = buildFilterColumns({ ...defaultParams, status: "upcoming" });
    const filter = getFilterMeta(columns, "dateRange");
    if (filter && filter.type === ColumnFilterType.DATE_RANGE) {
      expect(filter.dateRangeOptions?.range).toBe("future");
    }
  });

  it("sets dateRange to 'past' for past status", () => {
    const columns = buildFilterColumns({ ...defaultParams, status: "past" });
    const filter = getFilterMeta(columns, "dateRange");
    if (filter && filter.type === ColumnFilterType.DATE_RANGE) {
      expect(filter.dateRangeOptions?.range).toBe("past");
    }
  });

  it("sets dateRange to 'any' for cancelled status", () => {
    const columns = buildFilterColumns({ ...defaultParams, status: "cancelled" });
    const filter = getFilterMeta(columns, "dateRange");
    if (filter && filter.type === ColumnFilterType.DATE_RANGE) {
      expect(filter.dateRangeOptions?.range).toBe("any");
    }
  });

  it("sets dateRange to 'future' for unconfirmed status", () => {
    const columns = buildFilterColumns({ ...defaultParams, status: "unconfirmed" });
    const filter = getFilterMeta(columns, "dateRange");
    if (filter && filter.type === ColumnFilterType.DATE_RANGE) {
      expect(filter.dateRangeOptions?.range).toBe("future");
    }
  });

  it("sets dateRange to 'future' for recurring status", () => {
    const columns = buildFilterColumns({ ...defaultParams, status: "recurring" });
    const filter = getFilterMeta(columns, "dateRange");
    if (filter && filter.type === ColumnFilterType.DATE_RANGE) {
      expect(filter.dateRangeOptions?.range).toBe("future");
    }
  });

  it("disables sorting on all columns", () => {
    const columns = buildFilterColumns(defaultParams);
    columns.forEach((col) => {
      expect(col.enableSorting).toBe(false);
    });
  });

  it("enables filtering on all columns", () => {
    const columns = buildFilterColumns(defaultParams);
    columns.forEach((col) => {
      expect(col.enableColumnFilter).toBe(true);
    });
  });
});

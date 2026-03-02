// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInsightsBookings } from "./useInsightsBookings";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (text: string) => text,
  }),
}));

vi.mock("./useInsightsOrgTeams", () => ({
  useInsightsOrgTeams: () => ({
    isAll: false,
    teamId: 10,
    userId: 1,
  }),
}));

const mockGetFacetedUniqueValues = vi.fn().mockReturnValue(vi.fn());
vi.mock("./useInsightsBookingFacetedUniqueValues", () => ({
  useInsightsBookingFacetedUniqueValues: () => mockGetFacetedUniqueValues,
}));

vi.mock("@calcom/features/data-table", () => ({
  ColumnFilterType: {
    MULTI_SELECT: "MULTI_SELECT",
    SINGLE_SELECT: "SINGLE_SELECT",
    TEXT: "TEXT",
    NUMBER: "NUMBER",
  },
}));

describe("useInsightsBookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a table instance", () => {
    const { result } = renderHook(() => useInsightsBookings());
    expect(result.current.table).toBeDefined();
  });

  it("should define columns for eventTypeId, status, userId, paid, userEmail, userName, rating", () => {
    const { result } = renderHook(() => useInsightsBookings());
    const columns = result.current.table.getAllColumns();
    const columnIds = columns.map((c) => c.id);
    expect(columnIds).toContain("eventTypeId");
    expect(columnIds).toContain("status");
    expect(columnIds).toContain("userId");
    expect(columnIds).toContain("paid");
    expect(columnIds).toContain("userEmail");
    expect(columnIds).toContain("userName");
    expect(columnIds).toContain("rating");
  });

  it("should have all columns with filtering enabled", () => {
    const { result } = renderHook(() => useInsightsBookings());
    const columns = result.current.table.getAllColumns();
    for (const col of columns) {
      expect(col.getCanFilter()).toBe(true);
    }
  });

  it("should have all columns with sorting disabled", () => {
    const { result } = renderHook(() => useInsightsBookings());
    const columns = result.current.table.getAllColumns();
    for (const col of columns) {
      expect(col.getCanSort()).toBe(false);
    }
  });

  it("should initialize with empty data", () => {
    const { result } = renderHook(() => useInsightsBookings());
    expect(result.current.table.getRowModel().rows).toHaveLength(0);
  });
});

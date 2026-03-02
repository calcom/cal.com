// @vitest-environment jsdom

import { type ColumnFilter, ColumnFilterType } from "@calcom/features/data-table/lib/types";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInsightsBookingParameters } from "./useInsightsBookingParameters";

const mockUseInsightsOrgTeams = vi.fn();
vi.mock("./useInsightsOrgTeams", () => ({
  useInsightsOrgTeams: () => mockUseInsightsOrgTeams(),
}));

const mockUseDataTable = vi.fn();
vi.mock("~/data-table/hooks/useDataTable", () => ({
  useDataTable: () => mockUseDataTable(),
}));

const mockUseColumnFilters = vi.fn();
vi.mock("~/data-table/hooks/useColumnFilters", () => ({
  useColumnFilters: () => mockUseColumnFilters(),
}));

vi.mock("@calcom/features/data-table/lib/dateRange", () => ({
  getDefaultStartDate: () => new Date("2025-01-01T00:00:00.000Z"),
  getDefaultEndDate: () => new Date("2025-01-31T23:59:59.999Z"),
  DEFAULT_PRESET: { value: "t30d" },
}));

vi.mock("@calcom/dayjs", () => {
  const dayjs = (d: string | Date) => {
    const date = new Date(typeof d === "string" ? d : d.toISOString());
    return {
      startOf: () => ({ toISOString: () => date.toISOString() }),
      endOf: () => ({ toISOString: () => date.toISOString() }),
    };
  };
  dayjs.default = dayjs;
  return { default: dayjs };
});

vi.mock("@calcom/lib/timezoneConstants", () => ({
  CURRENT_TIMEZONE: "America/New_York",
}));

describe("useInsightsBookingParameters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseInsightsOrgTeams.mockReturnValue({
      scope: "user",
      selectedTeamId: undefined,
    });
    mockUseDataTable.mockReturnValue({ timeZone: "UTC" });
    mockUseColumnFilters.mockReturnValue([]);
  });

  it("should inject default date range when no date filter exists", () => {
    const { result } = renderHook(() => useInsightsBookingParameters());
    expect(result.current.columnFilters).toHaveLength(1);
    expect(result.current.columnFilters[0].id).toBe("startTime");
    expect(result.current.columnFilters[0].value).toMatchObject({
      type: ColumnFilterType.DATE_RANGE,
    });
  });

  it("should not inject default date range when startTime filter exists", () => {
    const existingFilter: ColumnFilter = {
      id: "startTime",
      value: {
        type: ColumnFilterType.DATE_RANGE,
        data: {
          startDate: "2025-06-01",
          endDate: "2025-06-30",
          preset: "custom",
        },
      },
    };
    mockUseColumnFilters.mockReturnValue([existingFilter]);
    const { result } = renderHook(() => useInsightsBookingParameters());
    expect(result.current.columnFilters).toHaveLength(1);
    expect(result.current.columnFilters[0]).toBe(existingFilter);
  });

  it("should not inject default date range when createdAt filter exists", () => {
    const existingFilter: ColumnFilter = {
      id: "createdAt",
      value: {
        type: ColumnFilterType.DATE_RANGE,
        data: {
          startDate: "2025-06-01",
          endDate: "2025-06-30",
          preset: "custom",
        },
      },
    };
    mockUseColumnFilters.mockReturnValue([existingFilter]);
    const { result } = renderHook(() => useInsightsBookingParameters());
    expect(result.current.columnFilters).toHaveLength(1);
    expect(result.current.columnFilters[0]).toBe(existingFilter);
  });

  it("should merge scope and selectedTeamId from useInsightsOrgTeams", () => {
    mockUseInsightsOrgTeams.mockReturnValue({
      scope: "team",
      selectedTeamId: 42,
    });
    const { result } = renderHook(() => useInsightsBookingParameters());
    expect(result.current.scope).toBe("team");
    expect(result.current.selectedTeamId).toBe(42);
  });

  it("should use timeZone from useDataTable when available", () => {
    mockUseDataTable.mockReturnValue({ timeZone: "Europe/London" });
    const { result } = renderHook(() => useInsightsBookingParameters());
    expect(result.current.timeZone).toBe("Europe/London");
  });

  it("should fall back to CURRENT_TIMEZONE when useDataTable returns no timeZone", () => {
    mockUseDataTable.mockReturnValue({ timeZone: "" });
    const { result } = renderHook(() => useInsightsBookingParameters());
    expect(result.current.timeZone).toBe("America/New_York");
  });
});

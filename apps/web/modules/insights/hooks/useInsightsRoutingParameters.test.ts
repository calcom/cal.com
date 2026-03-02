// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInsightsRoutingParameters } from "./useInsightsRoutingParameters";

const mockUseInsightsOrgTeams = vi.fn();
vi.mock("./useInsightsOrgTeams", () => ({
  useInsightsOrgTeams: () => mockUseInsightsOrgTeams(),
}));

const mockUseFilterValue = vi.fn();
vi.mock("~/data-table/hooks/useFilterValue", () => ({
  useFilterValue: (...args: unknown[]) => mockUseFilterValue(...args),
}));

const mockUseColumnFilters = vi.fn();
vi.mock("~/data-table/hooks/useColumnFilters", () => ({
  useColumnFilters: (...args: unknown[]) => mockUseColumnFilters(...args),
}));

vi.mock("@calcom/features/data-table", () => ({
  ZDateRangeFilterValue: { parse: vi.fn() },
}));

vi.mock("@calcom/features/data-table/lib/dateRange", () => ({
  getDefaultStartDate: () => new Date("2025-01-01T00:00:00.000Z"),
  getDefaultEndDate: () => new Date("2025-01-31T23:59:59.999Z"),
}));

vi.mock("@calcom/dayjs", () => {
  const dayjs = (d: string | Date) => {
    const date = new Date(typeof d === "string" ? d : d.toISOString());
    return {
      startOf: () => ({ toISOString: () => new Date(date.setUTCHours(0, 0, 0, 0)).toISOString() }),
      endOf: () => ({ toISOString: () => new Date(date.setUTCHours(23, 59, 59, 999)).toISOString() }),
    };
  };
  dayjs.default = dayjs;
  return { default: dayjs };
});

describe("useInsightsRoutingParameters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseInsightsOrgTeams.mockReturnValue({
      scope: "user",
      selectedTeamId: undefined,
    });
    mockUseFilterValue.mockReturnValue(undefined);
    mockUseColumnFilters.mockReturnValue([]);
  });

  it("should derive fallback startDate and endDate when no createdAt filter exists", () => {
    const { result } = renderHook(() => useInsightsRoutingParameters());
    expect(result.current.startDate).toContain("2025-01-01");
    expect(result.current.endDate).toContain("2025-01-31");
  });

  it("should derive startDate and endDate from createdAt filter when available", () => {
    mockUseFilterValue.mockReturnValue({
      data: {
        startDate: "2025-06-01T00:00:00.000Z",
        endDate: "2025-06-30T23:59:59.999Z",
      },
    });
    const { result } = renderHook(() => useInsightsRoutingParameters());
    expect(result.current.startDate).toContain("2025-06-01");
    expect(result.current.endDate).toContain("2025-06-30");
  });

  it("should pass scope and selectedTeamId from useInsightsOrgTeams", () => {
    mockUseInsightsOrgTeams.mockReturnValue({
      scope: "team",
      selectedTeamId: 99,
    });
    const { result } = renderHook(() => useInsightsRoutingParameters());
    expect(result.current.scope).toBe("team");
    expect(result.current.selectedTeamId).toBe(99);
  });

  it("should exclude createdAt from columnFilters", () => {
    mockUseColumnFilters.mockReturnValue([{ id: "status", value: "active" }]);
    const { result } = renderHook(() => useInsightsRoutingParameters());
    expect(result.current.columnFilters).toEqual([{ id: "status", value: "active" }]);
    expect(mockUseColumnFilters).toHaveBeenCalledWith({ exclude: ["createdAt"] });
  });
});

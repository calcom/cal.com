// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Hoisted mocks -----------------------------------------------------------
const mockUpdateFilter = vi.hoisted(() => vi.fn());
const mockActiveFilters = vi.hoisted(() => ({ current: [] as Array<{ f: string; v: unknown }> }));

vi.mock("~/data-table/hooks/useDataTable", () => ({
  useDataTable: () => ({
    activeFilters: mockActiveFilters.current,
    updateFilter: mockUpdateFilter,
  }),
}));

vi.mock("@calcom/dayjs", () => {
  const actual = {
    startOf: vi.fn().mockReturnThis(),
    endOf: vi.fn().mockReturnThis(),
    subtract: vi.fn().mockReturnThis(),
    toISOString: vi.fn().mockReturnValue("2024-03-20T00:00:00.000Z"),
  };
  const mockDayjs = vi.fn(() => actual);
  return { default: mockDayjs };
});

// --- Import under test -------------------------------------------------------
import type { BookingListingStatus } from "../types";

import { usePastBookingsDefaultDateRange } from "./use-past-bookings-default-date-range";

// --- Tests -------------------------------------------------------------------
type Props = { status: BookingListingStatus };

describe("usePastBookingsDefaultDateRange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveFilters.current = [];
  });

  it("applies default date range filter when status is 'past' and no dateRange filter exists", () => {
    const { result } = renderHook(() => usePastBookingsDefaultDateRange("past"));

    expect(mockUpdateFilter).toHaveBeenCalledTimes(1);
    expect(mockUpdateFilter).toHaveBeenCalledWith(
      "dateRange",
      expect.objectContaining({
        type: "dr",
        data: expect.objectContaining({
          preset: "w",
          startDate: expect.any(String),
          endDate: expect.any(String),
        }),
      })
    );
    // Should return fallbackDateRange for past tab
    expect(result.current.fallbackDateRange).toBeDefined();
    expect(result.current.fallbackDateRange?.startDate).toEqual(expect.any(String));
    expect(result.current.fallbackDateRange?.endDate).toEqual(expect.any(String));
  });

  it("does not apply default date range filter for non-past statuses", () => {
    const { result, rerender } = renderHook<ReturnType<typeof usePastBookingsDefaultDateRange>, Props>(
      ({ status }) => usePastBookingsDefaultDateRange(status),
      {
        initialProps: { status: "upcoming" },
      }
    );

    expect(mockUpdateFilter).not.toHaveBeenCalled();
    // Non-past tabs should return undefined fallbackDateRange
    expect(result.current.fallbackDateRange).toBeUndefined();

    rerender({ status: "recurring" });
    expect(mockUpdateFilter).not.toHaveBeenCalled();

    rerender({ status: "unconfirmed" });
    expect(mockUpdateFilter).not.toHaveBeenCalled();

    rerender({ status: "cancelled" });
    expect(mockUpdateFilter).not.toHaveBeenCalled();
  });

  it("does not apply default date range filter if dateRange filter already exists", () => {
    mockActiveFilters.current = [{ f: "dateRange", v: { type: "date_range", data: { preset: "t" } } }];

    renderHook(() => usePastBookingsDefaultDateRange("past"));

    expect(mockUpdateFilter).not.toHaveBeenCalled();
  });

  it("only applies the default once even on re-renders", () => {
    const { rerender } = renderHook<void, Props>(({ status }) => usePastBookingsDefaultDateRange(status), {
      initialProps: { status: "past" },
    });

    expect(mockUpdateFilter).toHaveBeenCalledTimes(1);

    rerender({ status: "past" });
    rerender({ status: "past" });

    // Should still only be called once due to the ref guard
    expect(mockUpdateFilter).toHaveBeenCalledTimes(1);
  });

  it("resets and re-applies when switching from non-past to past", () => {
    const { rerender } = renderHook<void, Props>(({ status }) => usePastBookingsDefaultDateRange(status), {
      initialProps: { status: "past" },
    });

    expect(mockUpdateFilter).toHaveBeenCalledTimes(1);

    // Switch to upcoming - resets the ref
    rerender({ status: "upcoming" });

    // Switch back to past - should re-apply
    rerender({ status: "past" });

    expect(mockUpdateFilter).toHaveBeenCalledTimes(2);
  });

});

// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Hoisted mocks -----------------------------------------------------------
const { mockUseQuery } = vi.hoisted(() => {
  const mockUseQuery = vi.fn();
  return { mockUseQuery };
});

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      bookings: {
        getBookingForTabResolution: { useQuery: mockUseQuery },
      },
    },
  },
}));

const mockSearchParams = vi.hoisted(() => ({
  get: vi.fn().mockReturnValue(null),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: vi.fn().mockReturnValue({ replace: vi.fn() }),
  usePathname: vi.fn().mockReturnValue("/bookings/upcoming"),
}));

// --- Import under test -------------------------------------------------------
import { useBookingTabResolution } from "./useBookingTabResolution";

// --- Tests -------------------------------------------------------------------
describe("useBookingTabResolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: undefined, isPending: false });
  });

  describe("deep-link detection", () => {
    it("enables the query when uid is present in URL at mount (deep link)", () => {
      mockSearchParams.get.mockReturnValue("booking-123");

      renderHook(() => useBookingTabResolution());

      expect(mockUseQuery).toHaveBeenCalledTimes(1);
      const [, queryOptions] = mockUseQuery.mock.calls[0];
      expect(queryOptions.enabled).toBe(true);
    });

    it("disables the query when no uid in URL at mount (no deep link)", () => {
      mockSearchParams.get.mockReturnValue(null);

      renderHook(() => useBookingTabResolution());

      expect(mockUseQuery).toHaveBeenCalledTimes(1);
      const [, queryOptions] = mockUseQuery.mock.calls[0];
      expect(queryOptions.enabled).toBe(false);
    });

    it("keeps the query disabled when uid appears in URL after mount (click, not deep link)", () => {
      // Initial mount: no uid
      mockSearchParams.get.mockReturnValue(null);

      const { rerender } = renderHook(() => useBookingTabResolution());

      // Simulate store-to-URL sync adding ?uid=xxx after a booking click
      mockSearchParams.get.mockReturnValue("booking-456");

      rerender();

      // The query should still be disabled because uid wasn't present at initial mount
      const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];
      const [, queryOptions] = lastCall;
      expect(queryOptions.enabled).toBe(false);
    });
  });

  describe("return values for non-deep-link scenarios", () => {
    it("returns isPending: false when uid appears after mount", () => {
      mockSearchParams.get.mockReturnValue(null);
      mockUseQuery.mockReturnValue({ data: undefined, isPending: true });

      const { result, rerender } = renderHook(() => useBookingTabResolution());

      mockSearchParams.get.mockReturnValue("booking-456");
      rerender();

      expect(result.current.isPending).toBe(false);
    });

    it("returns initialBookingUid as undefined when uid appears after mount", () => {
      mockSearchParams.get.mockReturnValue(null);

      const { result, rerender } = renderHook(() => useBookingTabResolution());

      mockSearchParams.get.mockReturnValue("booking-456");
      rerender();

      expect(result.current.initialBookingUid).toBeUndefined();
    });

    it("returns booking as null when uid appears after mount", () => {
      mockSearchParams.get.mockReturnValue(null);
      mockUseQuery.mockReturnValue({
        data: { uid: "booking-456", status: "ACCEPTED", endTime: new Date(), recurringEventId: null },
        isPending: false,
      });

      const { result, rerender } = renderHook(() => useBookingTabResolution());

      mockSearchParams.get.mockReturnValue("booking-456");
      rerender();

      expect(result.current.booking).toBeNull();
    });
  });

  describe("deep-link return values", () => {
    it("returns initialBookingUid with the uid value when deep linking", () => {
      mockSearchParams.get.mockReturnValue("booking-123");
      mockUseQuery.mockReturnValue({ data: undefined, isPending: false });

      const { result } = renderHook(() => useBookingTabResolution());

      expect(result.current.initialBookingUid).toBe("booking-123");
    });

    it("returns isPending: true from query when deep linking and query is pending", () => {
      mockSearchParams.get.mockReturnValue("booking-123");
      mockUseQuery.mockReturnValue({ data: undefined, isPending: true });

      const { result } = renderHook(() => useBookingTabResolution());

      expect(result.current.isPending).toBe(true);
    });

    it("returns the booking from query data when deep linking", () => {
      const mockBooking = {
        uid: "booking-123",
        status: "ACCEPTED",
        endTime: new Date(),
        recurringEventId: null,
      };
      mockSearchParams.get.mockReturnValue("booking-123");
      mockUseQuery.mockReturnValue({
        data: mockBooking,
        isPending: false,
      });

      const { result } = renderHook(() => useBookingTabResolution());

      expect(result.current.booking).toEqual(mockBooking);
    });
  });

  describe("query input shape", () => {
    it("passes uid as the query input", () => {
      mockSearchParams.get.mockReturnValue("booking-123");

      renderHook(() => useBookingTabResolution());

      const [queryInput] = mockUseQuery.mock.calls[0];
      expect(queryInput).toEqual({ uid: "booking-123" });
    });
  });
});

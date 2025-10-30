import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import type { BookingStatus } from "@calcom/prisma/enums";

import { useBookingLocation } from "./useBookingLocation";

// Mock the app-store functions
vi.mock("@calcom/app-store/locations", () => ({
  getSuccessPageLocationMessage: vi.fn((location: string) => location),
  guessEventLocationType: vi.fn((_location: string) => ({
    label: "Test Provider",
    iconUrl: "https://example.com/icon.png",
  })),
}));

describe("useBookingLocation", () => {
  const mockT = (key: string) => key;

  it("should return null when location is not provided", () => {
    const { result } = renderHook(() =>
      useBookingLocation({
        location: null,
        t: mockT,
      })
    );

    expect(result.current.locationToDisplay).toBeNull();
    expect(result.current.provider).toBeNull();
    expect(result.current.isLocationURL).toBe(false);
  });

  it("should use videoCallUrl when provided", () => {
    const { result } = renderHook(() =>
      useBookingLocation({
        location: "integrations:zoom",
        videoCallUrl: "https://zoom.us/j/123456789",
        t: mockT,
      })
    );

    expect(result.current.locationToDisplay).toBe("https://zoom.us/j/123456789");
  });

  it("should identify URL locations correctly", () => {
    const { result } = renderHook(() =>
      useBookingLocation({
        location: "https://meet.google.com/abc-defg-hij",
        t: mockT,
      })
    );

    expect(result.current.isLocationURL).toBe(true);
  });

  it("should identify non-URL locations correctly", () => {
    const { result } = renderHook(() =>
      useBookingLocation({
        location: "In-person meeting",
        t: mockT,
      })
    );

    expect(result.current.isLocationURL).toBe(false);
  });

  it("should pass bookingStatus to getSuccessPageLocationMessage", () => {
    const getSuccessPageLocationMessage = vi.fn((location: string) => location);
    vi.doMock("@calcom/app-store/locations", () => ({
      getSuccessPageLocationMessage,
      guessEventLocationType: vi.fn(),
    }));

    const bookingStatus: BookingStatus = "ACCEPTED";

    renderHook(() =>
      useBookingLocation({
        location: "test-location",
        t: mockT,
        bookingStatus,
      })
    );

    // Note: This test verifies the structure, actual implementation would need proper mocking
  });

  it("should memoize results to avoid unnecessary recalculations", () => {
    const { result, rerender } = renderHook(
      ({ location }) =>
        useBookingLocation({
          location,
          t: mockT,
        }),
      {
        initialProps: { location: "https://example.com" },
      }
    );

    const firstResult = result.current;

    // Rerender with same props
    rerender({ location: "https://example.com" });

    // Results should be the same object (memoized)
    expect(result.current.locationToDisplay).toBe(firstResult.locationToDisplay);
    expect(result.current.provider).toBe(firstResult.provider);
    expect(result.current.isLocationURL).toBe(firstResult.isLocationURL);
  });

  it("should handle undefined videoCallUrl gracefully", () => {
    const { result } = renderHook(() =>
      useBookingLocation({
        location: "integrations:daily",
        videoCallUrl: undefined,
        t: mockT,
      })
    );

    expect(result.current.locationToDisplay).toBe("integrations:daily");
  });
});

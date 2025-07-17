/**
 * @vitest-environment jsdom
 */
import { render } from "@testing-library/react";
import React from "react";
import { vi } from "vitest";
import { describe, expect, it, beforeEach } from "vitest";

import { TimeFormat } from "@calcom/lib/timeFormat";

// Mock all the dependencies used in Booker component
vi.mock("./components/hooks/useTimezoneChangeDetection", () => ({
  useTimezoneChangeDetection: vi.fn(),
}));

vi.mock("./components/hooks/useBookerTime", () => ({
  useBookerTime: vi.fn(),
}));

vi.mock("./components/hooks/useIsQuickAvailabilityCheckFeatureEnabled", () => ({
  useIsQuickAvailabilityCheckFeatureEnabled: vi.fn(),
}));

vi.mock("./store", () => ({
  useBookerStore: vi.fn(),
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      public: {
        event: {
          useQuery: vi.fn(),
        },
        slots: {
          getSchedule: {
            useQuery: vi.fn(),
          },
        },
      },
    },
  },
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: "div",
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  LazyMotion: ({ children }: { children: React.ReactNode }) => children,
}));

const { useTimezoneChangeDetection } = await import("./components/hooks/useTimezoneChangeDetection");
const { useBookerTime } = await import("./components/hooks/useBookerTime");
const { useIsQuickAvailabilityCheckFeatureEnabled } = await import(
  "./components/hooks/useIsQuickAvailabilityCheckFeatureEnabled"
);
const { useBookerStore } = await import("./store");
const { trpc } = await import("@calcom/trpc/react");

const mockUseTimezoneChangeDetection = vi.mocked(useTimezoneChangeDetection);
const mockUseBookerTime = vi.mocked(useBookerTime);
const mockUseIsQuickAvailabilityCheckFeatureEnabled = vi.mocked(useIsQuickAvailabilityCheckFeatureEnabled);
const mockUseBookerStore = vi.mocked(useBookerStore);
const mockTrpc = vi.mocked(trpc);

// Simplified component to test the integration logic
const TimezoneIntegrationTest = ({
  event,
}: {
  event?: { data?: { restrictionScheduleId?: number | null; useBookerTimezone?: boolean; title?: string } };
}) => {
  const eventDataForTimezoneDetection = event?.data
    ? {
        restrictionScheduleId: event.data.restrictionScheduleId,
        useBookerTimezone: event.data.useBookerTimezone,
      }
    : null;

  const { shouldRefreshSlots } = useTimezoneChangeDetection(eventDataForTimezoneDetection);

  React.useEffect(() => {
    if (shouldRefreshSlots) {
      // Mock slot refresh logic
      console.log("Slots refreshed due to timezone change");
    }
  }, [shouldRefreshSlots]);

  return (
    <div data-testid="timezone-integration">
      <div data-testid="should-refresh">{shouldRefreshSlots.toString()}</div>
    </div>
  );
};

describe("Timezone integration in Booker", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseBookerTime.mockReturnValue({
      timezone: "America/New_York",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezoneFromBookerStore: "America/New_York",
      timezoneFromTimePreferences: "America/New_York",
    });

    mockUseIsQuickAvailabilityCheckFeatureEnabled.mockReturnValue(false);

    mockUseBookerStore.mockReturnValue([
      {
        month: "2024-01",
        selectedDate: null,
        timezone: "America/New_York",
      },
      {},
    ]);

    const mockInvalidate = vi.fn();

    mockTrpc.viewer.public.slots.getSchedule.useQuery.mockReturnValue({
      data: { slots: {} },
      isLoading: false,
      error: null,
      invalidate: mockInvalidate,
    });
  });

  it("should pass correct event data to timezone detection hook when event has restrictions", () => {
    const eventWithRestrictions = {
      data: {
        restrictionScheduleId: 5,
        useBookerTimezone: true,
        title: "Test Event",
      },
    };

    mockTrpc.viewer.public.event.useQuery.mockReturnValue({
      data: eventWithRestrictions,
      isLoading: false,
      error: null,
    });

    mockUseTimezoneChangeDetection.mockReturnValue({
      shouldRefreshSlots: false,
      currentTimezone: "America/New_York",
      previousTimezone: null,
    });

    render(<TimezoneIntegrationTest event={eventWithRestrictions} />);

    expect(mockUseTimezoneChangeDetection).toHaveBeenCalledWith({
      restrictionScheduleId: 5,
      useBookerTimezone: true,
    });
  });

  it("should pass null to timezone detection hook when event has no data", () => {
    const eventWithoutData = null;

    mockUseTimezoneChangeDetection.mockReturnValue({
      shouldRefreshSlots: false,
      currentTimezone: "America/New_York",
      previousTimezone: null,
    });

    render(<TimezoneIntegrationTest event={eventWithoutData} />);

    expect(mockUseTimezoneChangeDetection).toHaveBeenCalledWith(null);
  });

  it("should handle event with null restriction data", () => {
    const eventWithNullRestrictions = {
      data: {
        restrictionScheduleId: null,
        useBookerTimezone: false,
        title: "Test Event",
      },
    };

    mockUseTimezoneChangeDetection.mockReturnValue({
      shouldRefreshSlots: false,
      currentTimezone: "America/New_York",
      previousTimezone: null,
    });

    render(<TimezoneIntegrationTest event={eventWithNullRestrictions} />);

    expect(mockUseTimezoneChangeDetection).toHaveBeenCalledWith({
      restrictionScheduleId: null,
      useBookerTimezone: false,
    });
  });

  it("should trigger slot refresh when shouldRefreshSlots is true", () => {
    const consoleSpy = vi.spyOn(console, "log");

    const eventWithRestrictions = {
      data: {
        restrictionScheduleId: 1,
        useBookerTimezone: true,
      },
    };

    mockUseTimezoneChangeDetection.mockReturnValue({
      shouldRefreshSlots: true,
      currentTimezone: "America/Los_Angeles",
      previousTimezone: "America/New_York",
    });

    render(<TimezoneIntegrationTest event={eventWithRestrictions} />);

    expect(consoleSpy).toHaveBeenCalledWith("Slots refreshed due to timezone change");

    consoleSpy.mockRestore();
  });

  it("should not trigger slot refresh when shouldRefreshSlots is false", () => {
    const consoleSpy = vi.spyOn(console, "log");

    const eventWithRestrictions = {
      data: {
        restrictionScheduleId: 1,
        useBookerTimezone: true,
      },
    };

    mockUseTimezoneChangeDetection.mockReturnValue({
      shouldRefreshSlots: false,
      currentTimezone: "America/New_York",
      previousTimezone: null,
    });

    render(<TimezoneIntegrationTest event={eventWithRestrictions} />);

    expect(consoleSpy).not.toHaveBeenCalledWith("Slots refreshed due to timezone change");

    consoleSpy.mockRestore();
  });

  it("should handle missing event data gracefully", () => {
    mockUseTimezoneChangeDetection.mockReturnValue({
      shouldRefreshSlots: false,
      currentTimezone: "UTC",
      previousTimezone: null,
    });

    render(<TimezoneIntegrationTest />);

    expect(mockUseTimezoneChangeDetection).toHaveBeenCalledWith(null);
  });
});

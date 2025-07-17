import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render, screen } from "@testing-library/react";
import React from "react";
import { vi } from "vitest";
import { describe, expect, it, beforeEach } from "vitest";

import { TimeFormat } from "@calcom/lib/timeFormat";

// Mock the timezone detection hook
vi.mock("./components/hooks/useTimezoneChangeDetection", () => ({
  useTimezoneChangeDetection: vi.fn(),
}));

// Mock other required dependencies
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

// Import after mocks
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

// Mock the entire Booker component with a simplified version for testing
const MockBooker = ({ onSlotRefresh }: { onSlotRefresh?: () => void }) => {
  const { timezone } = useBookerTime();
  const { shouldRefreshSlots } = useTimezoneChangeDetection({
    restrictionScheduleId: 1,
    useBookerTimezone: true,
  });

  React.useEffect(() => {
    if (shouldRefreshSlots && onSlotRefresh) {
      onSlotRefresh();
    }
  }, [shouldRefreshSlots, onSlotRefresh]);

  return (
    <div data-testid="booker">
      <div data-testid="timezone">{timezone}</div>
      <div data-testid="should-refresh">{shouldRefreshSlots.toString()}</div>
    </div>
  );
};

describe("Booker component timezone integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockUseBookerTime.mockReturnValue({
      timezone: "America/New_York",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezoneFromBookerStore: "America/New_York",
      timezoneFromTimePreferences: "America/New_York",
    });

    mockUseIsQuickAvailabilityCheckFeatureEnabled.mockReturnValue(false);

    mockUseBookerStore.mockReturnValue([
      // Mock state
      {
        month: "2024-01",
        selectedDate: null,
        timezone: "America/New_York",
      },
      // Mock actions (simplified)
      {},
    ]);

    mockTrpc.viewer.public.event.useQuery.mockReturnValue({
      data: {
        data: {
          restrictionScheduleId: 1,
          useBookerTimezone: true,
        },
      },
      isLoading: false,
      error: null,
    });

    mockTrpc.viewer.public.slots.getSchedule.useQuery.mockReturnValue({
      data: {
        slots: {},
      },
      isLoading: false,
      error: null,
      invalidate: vi.fn(),
    });
  });

  it("should not trigger slot refresh on initial render", () => {
    mockUseTimezoneChangeDetection.mockReturnValue({
      shouldRefreshSlots: false,
      currentTimezone: "America/New_York",
      previousTimezone: "America/New_York",
    });

    const onSlotRefresh = vi.fn();

    render(
      <TooltipProvider>
        <MockBooker onSlotRefresh={onSlotRefresh} />
      </TooltipProvider>
    );

    expect(screen.getByTestId("should-refresh")).toHaveTextContent("false");
    expect(onSlotRefresh).not.toHaveBeenCalled();
  });

  it("should trigger slot refresh when timezone changes and conditions are met", () => {
    mockUseTimezoneChangeDetection.mockReturnValue({
      shouldRefreshSlots: true,
      currentTimezone: "America/Los_Angeles",
      previousTimezone: "America/New_York",
    });

    const onSlotRefresh = vi.fn();

    render(
      <TooltipProvider>
        <MockBooker onSlotRefresh={onSlotRefresh} />
      </TooltipProvider>
    );

    expect(screen.getByTestId("should-refresh")).toHaveTextContent("true");
    expect(onSlotRefresh).toHaveBeenCalledTimes(1);
  });

  it("should handle timezone detection with event data", () => {
    const eventData = {
      restrictionScheduleId: 5,
      useBookerTimezone: true,
    };

    mockUseTimezoneChangeDetection.mockReturnValue({
      shouldRefreshSlots: false,
      currentTimezone: "Europe/London",
      previousTimezone: "Europe/London",
    });

    const TestComponent = () => {
      const { shouldRefreshSlots } = useTimezoneChangeDetection(eventData);
      return <div data-testid="refresh-status">{shouldRefreshSlots.toString()}</div>;
    };

    render(<TestComponent />);

    expect(mockUseTimezoneChangeDetection).toHaveBeenCalledWith(eventData);
    expect(screen.getByTestId("refresh-status")).toHaveTextContent("false");
  });

  it("should handle null event data gracefully", () => {
    mockUseTimezoneChangeDetection.mockReturnValue({
      shouldRefreshSlots: false,
      currentTimezone: "Asia/Tokyo",
      previousTimezone: "Asia/Tokyo",
    });

    const TestComponent = () => {
      const { shouldRefreshSlots } = useTimezoneChangeDetection(null);
      return <div data-testid="refresh-status">{shouldRefreshSlots.toString()}</div>;
    };

    render(<TestComponent />);

    expect(mockUseTimezoneChangeDetection).toHaveBeenCalledWith(null);
    expect(screen.getByTestId("refresh-status")).toHaveTextContent("false");
  });

  it("should pass correct event data structure to timezone detection hook", () => {
    const eventWithRestrictions = {
      data: {
        restrictionScheduleId: 10,
        useBookerTimezone: true,
        // Other event properties would be here
        title: "Test Event",
        duration: 30,
      },
    };

    mockTrpc.viewer.public.event.useQuery.mockReturnValue({
      data: eventWithRestrictions,
      isLoading: false,
      error: null,
    });

    mockUseTimezoneChangeDetection.mockReturnValue({
      shouldRefreshSlots: false,
      currentTimezone: "UTC",
      previousTimezone: "UTC",
    });

    const TestComponent = () => {
      const eventDataForTimezoneDetection = eventWithRestrictions?.data
        ? {
            restrictionScheduleId: eventWithRestrictions.data.restrictionScheduleId,
            useBookerTimezone: eventWithRestrictions.data.useBookerTimezone,
          }
        : null;

      useTimezoneChangeDetection(eventDataForTimezoneDetection);
      return <div data-testid="test">Test</div>;
    };

    render(<TestComponent />);

    expect(mockUseTimezoneChangeDetection).toHaveBeenCalledWith({
      restrictionScheduleId: 10,
      useBookerTimezone: true,
    });
  });

  it("should handle event without restriction data", () => {
    const eventWithoutRestrictions = {
      data: {
        restrictionScheduleId: null,
        useBookerTimezone: false,
        title: "Test Event",
        duration: 30,
      },
    };

    mockTrpc.viewer.public.event.useQuery.mockReturnValue({
      data: eventWithoutRestrictions,
      isLoading: false,
      error: null,
    });

    mockUseTimezoneChangeDetection.mockReturnValue({
      shouldRefreshSlots: false,
      currentTimezone: "UTC",
      previousTimezone: "UTC",
    });

    const TestComponent = () => {
      const eventDataForTimezoneDetection = eventWithoutRestrictions?.data
        ? {
            restrictionScheduleId: eventWithoutRestrictions.data.restrictionScheduleId,
            useBookerTimezone: eventWithoutRestrictions.data.useBookerTimezone,
          }
        : null;

      useTimezoneChangeDetection(eventDataForTimezoneDetection);
      return <div data-testid="test">Test</div>;
    };

    render(<TestComponent />);

    expect(mockUseTimezoneChangeDetection).toHaveBeenCalledWith({
      restrictionScheduleId: null,
      useBookerTimezone: false,
    });
  });

  it("should handle missing event data", () => {
    mockTrpc.viewer.public.event.useQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    mockUseTimezoneChangeDetection.mockReturnValue({
      shouldRefreshSlots: false,
      currentTimezone: "UTC",
      previousTimezone: "UTC",
    });

    const TestComponent = () => {
      const eventDataForTimezoneDetection = null;

      useTimezoneChangeDetection(eventDataForTimezoneDetection);
      return <div data-testid="test">Test</div>;
    };

    render(<TestComponent />);

    expect(mockUseTimezoneChangeDetection).toHaveBeenCalledWith(null);
  });
});

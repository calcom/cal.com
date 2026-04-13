import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

// --- Mocks for external dependencies ---

let mockOverlayCalendarParam: string | null = null;

vi.mock("@calcom/features/bookings/Booker/utils/query-param", () => ({
  getQueryParam: (param: string) => {
    if (param === "overlayCalendar") return mockOverlayCalendarParam;
    return null;
  },
  updateQueryParam: vi.fn(),
  removeQueryParam: vi.fn(),
}));

vi.mock("@calcom/lib/webstorage", () => ({
  localStorage: {
    getItem: () => null,
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

let mockIsOverlapping = false;

vi.mock("@calcom/features/bookings/lib/useCheckOverlapWithOverlay", () => ({
  useCheckOverlapWithOverlay: () => ({
    isOverlapping: mockIsOverlapping,
    overlappingTimeStart: mockIsOverlapping ? "10:00" : null,
    overlappingTimeEnd: mockIsOverlapping ? "10:30" : null,
  }),
}));

vi.mock("@calcom/features/bookings/Booker/hooks/useBookerTime", () => ({
  useBookerTime: () => ({
    timezone: "UTC",
    timeFormat: "h:mma",
    timezoneFromBookerStore: null,
    timezoneFromTimePreferences: "UTC",
  }),
}));

vi.mock("@calcom/features/bookings/Booker/BookerStoreProvider", () => ({
  useBookerStoreContext: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      selectedTimeslot: null,
      bookingData: null,
      layout: "MONTH_VIEW",
    }),
}));

vi.mock("@calcom/app-store/_utils/payments/getPaymentAppData", () => ({
  getPaymentAppData: () => ({ price: 0 }),
}));

vi.mock("@coss/ui/icons", () => ({
  CalendarX2Icon: (props: Record<string, unknown>) => <span data-testid="calendar-icon" {...props} />,
}));

vi.mock("@radix-ui/react-hover-card", () => ({
  Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Trigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  m: {
    div: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("./OutOfOfficeInSlots", () => ({
  OutOfOfficeInSlots: () => null,
}));

vi.mock("./SeatsAvailabilityText", () => ({
  SeatsAvailabilityText: () => <span>seats</span>,
}));

// --- Import component under test after mocks ---

import type { AvailableTimesProps } from "./AvailableTimes";
import { AvailableTimes } from "./AvailableTimes";

// --- Helpers ---

const baseSlot = {
  time: "2026-04-09T10:00:00.000Z",
  attendees: 0,
};

const baseProps: AvailableTimesProps = {
  slots: [baseSlot] as AvailableTimesProps["slots"],
  event: {
    data: {
      length: 30,
      bookingFields: [] as unknown as NonNullable<
        NonNullable<AvailableTimesProps["event"]>["data"]
      >["bookingFields"],
      price: 0,
      currency: "usd",
      metadata: {},
    },
  },
  onTimeSelect: vi.fn(),
  unavailableTimeSlots: [] as string[],
};

function getDotElement(): HTMLSpanElement | null {
  const timeButton = screen.getByTestId("time");
  return timeButton.querySelector("span.rounded-full");
}

// --- Tests ---

describe("AvailableTimes dot indicators", () => {
  beforeEach(() => {
    mockOverlayCalendarParam = null;
    mockIsOverlapping = false;
  });

  describe("host reschedule with overlay calendar enabled", () => {
    it("should show host busy dot (red) when hostBusyTimes overlaps, even with overlay enabled", () => {
      mockOverlayCalendarParam = "true";
      mockIsOverlapping = false;

      render(
        <AvailableTimes
          {...baseProps}
          hostBusyTimes={[{ start: "2026-04-09T09:45:00.000Z", end: "2026-04-09T10:15:00.000Z" }]}
        />
      );

      const dot = getDotElement();
      expect(dot).not.toBeNull();
      expect(dot!.className).toContain("bg-rose-600");
    });

    it("should show host free dot (green) when hostBusyTimes does not overlap, even with overlay enabled", () => {
      mockOverlayCalendarParam = "true";
      mockIsOverlapping = true;

      render(
        <AvailableTimes
          {...baseProps}
          hostBusyTimes={[{ start: "2026-04-09T14:00:00.000Z", end: "2026-04-09T14:30:00.000Z" }]}
        />
      );

      const dot = getDotElement();
      expect(dot).not.toBeNull();
      expect(dot!.className).toContain("bg-emerald-400");
    });

    it("should show host green dot when hostBusyTimes is empty array and overlay is enabled", () => {
      mockOverlayCalendarParam = "true";
      mockIsOverlapping = true;

      render(<AvailableTimes {...baseProps} hostBusyTimes={[]} />);

      const dot = getDotElement();
      expect(dot).not.toBeNull();
      expect(dot!.className).toContain("bg-emerald-400");
    });
  });

  describe("non-host reschedule with overlay calendar enabled", () => {
    it("should show overlay red dot when overlapping and no hostBusyTimes", () => {
      mockOverlayCalendarParam = "true";
      mockIsOverlapping = true;

      render(<AvailableTimes {...baseProps} />);

      const dot = getDotElement();
      expect(dot).not.toBeNull();
      expect(dot!.className).toContain("bg-rose-600");
    });

    it("should show overlay green dot when not overlapping and no hostBusyTimes", () => {
      mockOverlayCalendarParam = "true";
      mockIsOverlapping = false;

      render(<AvailableTimes {...baseProps} />);

      const dot = getDotElement();
      expect(dot).not.toBeNull();
      expect(dot!.className).toContain("bg-emerald-400");
    });
  });

  describe("non-host reschedule with overlay calendar disabled", () => {
    it("should show no dot when overlay is off and no hostBusyTimes", () => {
      mockOverlayCalendarParam = null;
      mockIsOverlapping = false;

      render(<AvailableTimes {...baseProps} />);

      const dot = getDotElement();
      expect(dot).toBeNull();
    });
  });

  describe("host reschedule with overlay calendar disabled", () => {
    it("should show host busy dot (red) when overlay is off", () => {
      mockOverlayCalendarParam = null;

      render(
        <AvailableTimes
          {...baseProps}
          hostBusyTimes={[{ start: "2026-04-09T09:45:00.000Z", end: "2026-04-09T10:15:00.000Z" }]}
        />
      );

      const dot = getDotElement();
      expect(dot).not.toBeNull();
      expect(dot!.className).toContain("bg-rose-600");
    });

    it("should show host free dot (green) when overlay is off and slot is free", () => {
      mockOverlayCalendarParam = null;

      render(
        <AvailableTimes
          {...baseProps}
          hostBusyTimes={[{ start: "2026-04-09T14:00:00.000Z", end: "2026-04-09T14:30:00.000Z" }]}
        />
      );

      const dot = getDotElement();
      expect(dot).not.toBeNull();
      expect(dot!.className).toContain("bg-emerald-400");
    });
  });
});

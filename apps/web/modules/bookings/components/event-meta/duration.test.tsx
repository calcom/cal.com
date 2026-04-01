import type { TFunction } from "i18next";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock embed-iframe before importing component
vi.mock("@calcom/embed-core/embed-iframe", () => ({
  useIsEmbed: () => false,
}));

// Mock useShouldShowArrows
vi.mock("@calcom/features/bookings/Booker/hooks/useShouldShowArrows", () => ({
  useShouldShowArrows: () => ({
    ref: { current: null },
    calculateScroll: vi.fn(),
    leftVisible: false,
    rightVisible: false,
  }),
}));

// Mock useLocale
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === "minute_one_short") return `${opts?.count}m`;
      if (key === "hour_one_short") return `${opts?.count}h`;
      if (key === "multiple_duration_timeUnit_short") {
        const unit = opts?.unit as string;
        if (unit === "minute") return `${opts?.count}m`;
        if (unit === "hour") return `${opts?.count}h`;
      }
      return key;
    },
  }),
}));

import { render, screen } from "@calcom/features/bookings/Booker/__tests__/test-utils";
import { EventDuration, getDurationFormatted } from "./Duration";

function setWindowSearch(search: string): void {
  Object.defineProperty(window, "location", {
    value: { ...window.location, search },
    writable: true,
  });
}

describe("getDurationFormatted", () => {
  const t = ((key: string, opts?: Record<string, unknown>) => {
    if (key === "minute_one_short") return `${opts?.count}m`;
    if (key === "hour_one_short") return `${opts?.count}h`;
    if (key === "multiple_duration_timeUnit_short") {
      const unit = opts?.unit as string;
      if (unit === "minute") return `${opts?.count}m`;
      if (unit === "hour") return `${opts?.count}h`;
    }
    return key;
  }) as unknown as TFunction;

  it("returns null for undefined", () => {
    expect(getDurationFormatted(undefined, t)).toBeNull();
  });

  it("returns null for 0", () => {
    expect(getDurationFormatted(0, t)).toBeNull();
  });

  it("formats minutes under 60", () => {
    expect(getDurationFormatted(30, t)).toBe("30m");
  });

  it("formats exactly 60 minutes as 1 hour", () => {
    expect(getDurationFormatted(60, t)).toBe("1h");
  });

  it("formats hours and minutes", () => {
    expect(getDurationFormatted(90, t)).toBe("1h 30m");
  });

  it("formats multiple hours", () => {
    expect(getDurationFormatted(120, t)).toBe("2h");
  });

  it("formats 1 minute", () => {
    expect(getDurationFormatted(1, t)).toBe("1m");
  });
});

describe("EventDuration", () => {
  const mockSetSelectedDuration = vi.fn();

  const multiDurationEvent = {
    length: 30,
    metadata: { multipleDuration: [30, 45, 60] },
    isDynamic: false,
  };

  const singleDurationEvent = {
    length: 30,
    metadata: {},
    isDynamic: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setWindowSearch("");
  });

  describe("duration selector rendering", () => {
    it("renders duration buttons when selectedDuration is set and event has multipleDuration", () => {
      render(<EventDuration event={multiDurationEvent} />, {
        mockStore: {
          selectedDuration: 30,
          setSelectedDuration: mockSetSelectedDuration,
          state: "selecting_date",
        },
      });

      expect(screen.getByTestId("multiple-choice-30mins")).toBeInTheDocument();
      expect(screen.getByTestId("multiple-choice-45mins")).toBeInTheDocument();
      expect(screen.getByTestId("multiple-choice-60mins")).toBeInTheDocument();
    });

    it("returns null when selectedDuration is null and event has multipleDuration", () => {
      const { container } = render(<EventDuration event={multiDurationEvent} />, {
        mockStore: {
          selectedDuration: null,
          setSelectedDuration: mockSetSelectedDuration,
          state: "selecting_date",
        },
      });

      expect(container.querySelector("[data-testid]")).toBeNull();
    });

    it("renders formatted text for single-duration events", () => {
      render(<EventDuration event={singleDurationEvent} />, {
        mockStore: {
          selectedDuration: 30,
          setSelectedDuration: mockSetSelectedDuration,
          state: "selecting_date",
        },
      });

      expect(screen.getByText("30m")).toBeInTheDocument();
    });

    it("marks active duration button", () => {
      render(<EventDuration event={multiDurationEvent} />, {
        mockStore: {
          selectedDuration: 45,
          setSelectedDuration: mockSetSelectedDuration,
          state: "selecting_date",
        },
      });

      expect(screen.getByTestId("multiple-choice-45mins")).toHaveAttribute("data-active", "true");
      expect(screen.getByTestId("multiple-choice-30mins")).toHaveAttribute("data-active", "false");
    });

    it("only shows selected duration in booking state", () => {
      render(<EventDuration event={multiDurationEvent} />, {
        mockStore: {
          selectedDuration: 45,
          setSelectedDuration: mockSetSelectedDuration,
          state: "booking",
        },
      });

      expect(screen.getByTestId("multiple-choice-45mins")).toBeInTheDocument();
      expect(screen.queryByTestId("multiple-choice-30mins")).not.toBeInTheDocument();
      expect(screen.queryByTestId("multiple-choice-60mins")).not.toBeInTheDocument();
    });
  });

  describe("isRescheduling detection (embed duration bug fix)", () => {
    it("initializes selectedDuration when rescheduleUid param is empty string", () => {
      setWindowSearch("?rescheduleUid=&embed=true");

      render(<EventDuration event={multiDurationEvent} />, {
        mockStore: {
          selectedDuration: null,
          setSelectedDuration: mockSetSelectedDuration,
          state: "selecting_date",
        },
      });

      // With the fix (.get instead of .has), empty rescheduleUid should NOT be treated as rescheduling
      // So setSelectedDuration should be called with the default event length
      expect(mockSetSelectedDuration).toHaveBeenCalledWith(30);
    });

    it("does not initialize selectedDuration when rescheduleUid has a real value", () => {
      setWindowSearch("?rescheduleUid=abc123");

      render(<EventDuration event={multiDurationEvent} />, {
        mockStore: {
          selectedDuration: null,
          setSelectedDuration: mockSetSelectedDuration,
          state: "selecting_date",
        },
      });

      // Real rescheduleUid means we're rescheduling — don't override duration
      expect(mockSetSelectedDuration).not.toHaveBeenCalled();
    });

    it("initializes selectedDuration when no rescheduleUid param exists", () => {
      setWindowSearch("?embed=true");

      render(<EventDuration event={multiDurationEvent} />, {
        mockStore: {
          selectedDuration: null,
          setSelectedDuration: mockSetSelectedDuration,
          state: "selecting_date",
        },
      });

      expect(mockSetSelectedDuration).toHaveBeenCalledWith(30);
    });

    it("does not re-initialize when selectedDuration already set", () => {
      setWindowSearch("");

      render(<EventDuration event={multiDurationEvent} />, {
        mockStore: {
          selectedDuration: 45,
          setSelectedDuration: mockSetSelectedDuration,
          state: "selecting_date",
        },
      });

      expect(mockSetSelectedDuration).not.toHaveBeenCalled();
    });
  });

  describe("dynamic events", () => {
    it("initializes selectedDuration for dynamic events", () => {
      setWindowSearch("");

      const dynamicEvent = {
        length: 30,
        metadata: {},
        isDynamic: true,
      };

      render(<EventDuration event={dynamicEvent} />, {
        mockStore: {
          selectedDuration: null,
          setSelectedDuration: mockSetSelectedDuration,
          state: "selecting_date",
        },
      });

      expect(mockSetSelectedDuration).toHaveBeenCalledWith(30);
    });
  });

  describe("hideDurationSelector", () => {
    it("shows formatted text instead of buttons when hideDurationSelectorInBookingPage is true", () => {
      const eventWithHiddenSelector = {
        length: 30,
        metadata: {
          multipleDuration: [30, 45, 60],
          hideDurationSelectorInBookingPage: true,
        },
        isDynamic: false,
      };

      render(<EventDuration event={eventWithHiddenSelector} />, {
        mockStore: {
          selectedDuration: 45,
          setSelectedDuration: mockSetSelectedDuration,
          state: "selecting_date",
        },
      });

      expect(screen.getByText("45m")).toBeInTheDocument();
      expect(screen.queryByTestId("multiple-choice-30mins")).not.toBeInTheDocument();
    });
  });
});

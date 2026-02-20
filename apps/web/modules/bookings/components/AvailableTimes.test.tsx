import { render, screen } from "@calcom/features/bookings/Booker/__tests__/test-utils";
import { TimeFormat } from "@calcom/lib/timeFormat";
import { vi } from "vitest";
import { AvailableTimes } from "./AvailableTimes";

const mockUseBookerTime = vi.fn();
vi.mock("@calcom/features/bookings/Booker/hooks/useBookerTime", () => ({
  useBookerTime: () => mockUseBookerTime(),
}));

vi.mock("@calcom/features/bookings/lib/useCheckOverlapWithOverlay", () => ({
  useCheckOverlapWithOverlay: () => ({ isOverlapping: false }),
}));

vi.mock("@calcom/atoms/hooks/useIsPlatform", () => ({
  useIsPlatform: () => false,
}));

const createSlot = (time: string) => ({
  time,
  attendees: 0,
});

describe("AvailableTimes AM/PM indicator", () => {
  const defaultProps = {
    slots: [
      createSlot("2024-01-15T02:00:00Z"), // 2 AM UTC
      createSlot("2024-01-15T14:00:00Z"), // 2 PM UTC
    ],
    event: { data: { length: 30 } },
    showTimeFormatToggle: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows AM indicator (sun icon) for morning slots in 12-hour format", () => {
    mockUseBookerTime.mockReturnValue({
      timeFormat: TimeFormat.TWELVE_HOUR,
      timezone: "UTC",
      timezoneFromBookerStore: null,
      timezoneFromTimePreferences: "UTC",
    });

    render(<AvailableTimes {...defaultProps} />);

    const amIndicators = screen.getAllByTestId("time-slot-am-pm-indicator");
    expect(amIndicators.length).toBe(2);

    const amOnly = amIndicators.filter((el) => el.getAttribute("data-period") === "am");
    expect(amOnly.length).toBe(1);
  });

  it("shows PM indicator (moon icon) for afternoon slots in 12-hour format", () => {
    mockUseBookerTime.mockReturnValue({
      timeFormat: TimeFormat.TWELVE_HOUR,
      timezone: "UTC",
      timezoneFromBookerStore: null,
      timezoneFromTimePreferences: "UTC",
    });

    render(<AvailableTimes {...defaultProps} />);

    const pmIndicators = screen.getAllByTestId("time-slot-am-pm-indicator");
    const pmOnly = pmIndicators.filter((el) => el.getAttribute("data-period") === "pm");
    expect(pmOnly.length).toBe(1);
  });

  it("does not show AM/PM indicator in 24-hour format", () => {
    mockUseBookerTime.mockReturnValue({
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timezone: "UTC",
      timezoneFromBookerStore: null,
      timezoneFromTimePreferences: "UTC",
    });

    render(<AvailableTimes {...defaultProps} />);

    expect(screen.queryByTestId("time-slot-am-pm-indicator")).not.toBeInTheDocument();
  });
});

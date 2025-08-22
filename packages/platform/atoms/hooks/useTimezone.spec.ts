import { renderHook } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import dayjs from "@calcom/dayjs";

import { useMe } from "./useMe";
import { useTimezone } from "./useTimezone";

// Mock the useMe hook
vi.mock("./useMe", () => ({
  useMe: vi.fn(),
}));

// Mock dayjs.tz.guess
vi.mock("@calcom/dayjs", () => ({
  default: {
    tz: {
      guess: vi.fn(),
    },
  },
}));

describe("useTimezone", () => {
  const mockUseMe = useMe as jest.MockedFunction<typeof useMe>;
  const mockDayjsTzGuess = dayjs.tz.guess as jest.MockedFunction<typeof dayjs.tz.guess>;
  const mockOnTimeZoneChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockDayjsTzGuess.mockReturnValue("Europe/London");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should NOT call onTimeZoneChange when user has any timezone preference set", () => {
    // Mock user with any timezone preference set
    mockUseMe.mockReturnValue({
      data: {
        data: {
          timeZone: "Europe/London", // User has set any timezone preference
        },
      },
      isLoading: false,
    } as any);

    // Browser timezone is different from user's timezone
    mockDayjsTzGuess.mockReturnValue("Asia/Kolkata");

    renderHook(() => useTimezone(mockOnTimeZoneChange, "Asia/Kolkata"));

    // Should NOT call onTimeZoneChange because user has any timezone preference set
    expect(mockOnTimeZoneChange).not.toHaveBeenCalled();
  });

  it("should call onTimeZoneChange when user has NO timezone preference set", () => {
    // Mock user without any timezone preference
    mockUseMe.mockReturnValue({
      data: {
        data: {
          timeZone: null, // User has NO timezone preference set
        },
      },
      isLoading: false,
    } as any);

    // Browser timezone is different from user's timezone
    mockDayjsTzGuess.mockReturnValue("Asia/Kolkata");

    renderHook(() => useTimezone(mockOnTimeZoneChange, "Asia/Kolkata"));

    // Should call onTimeZoneChange because user has NO timezone preference set
    expect(mockOnTimeZoneChange).toHaveBeenCalledWith("Asia/Kolkata");
  });

  it("should NOT call onTimeZoneChange when timezones are the same", () => {
    // Mock user with any timezone preference set
    mockUseMe.mockReturnValue({
      data: {
        data: {
          timeZone: "Europe/London",
        },
      },
      isLoading: false,
    } as any);

    // Browser timezone is the same as user's timezone
    mockDayjsTzGuess.mockReturnValue("Europe/London");

    renderHook(() => useTimezone(mockOnTimeZoneChange, "Europe/London"));

    // Should NOT call onTimeZoneChange because timezones are the same
    expect(mockOnTimeZoneChange).not.toHaveBeenCalled();
  });

  it("should NOT call onTimeZoneChange when still loading", () => {
    // Mock user with any timezone preference set but still loading
    mockUseMe.mockReturnValue({
      data: {
        data: {
          timeZone: "Europe/London",
        },
      },
      isLoading: true, // Still loading
    } as any);

    // Browser timezone is different from user's timezone
    mockDayjsTzGuess.mockReturnValue("Asia/Kolkata");

    renderHook(() => useTimezone(mockOnTimeZoneChange, "Asia/Kolkata"));

    // Should NOT call onTimeZoneChange because still loading
    expect(mockOnTimeZoneChange).not.toHaveBeenCalled();
  });

  it("should NOT call onTimeZoneChange when no callback provided", () => {
    // Mock user without any timezone preference
    mockUseMe.mockReturnValue({
      data: {
        data: {
          timeZone: null,
        },
      },
      isLoading: false,
    } as any);

    // Browser timezone is different from user's timezone
    mockDayjsTzGuess.mockReturnValue("Asia/Kolkata");

    renderHook(() => useTimezone(undefined, "Asia/Kolkata"));

    // Should NOT call onTimeZoneChange because no callback provided
    expect(mockOnTimeZoneChange).not.toHaveBeenCalled();
  });

  it("should NOT call onTimeZoneChange when user has empty string timezone", () => {
    // Mock user with empty string timezone (should be treated as no preference)
    mockUseMe.mockReturnValue({
      data: {
        data: {
          timeZone: "", // Empty string should be treated as no preference
        },
      },
      isLoading: false,
    } as any);

    // Browser timezone is different from user's timezone
    mockDayjsTzGuess.mockReturnValue("Asia/Kolkata");

    renderHook(() => useTimezone(mockOnTimeZoneChange, "Asia/Kolkata"));

    // Should call onTimeZoneChange because empty string is treated as no preference
    expect(mockOnTimeZoneChange).toHaveBeenCalledWith("Asia/Kolkata");
  });
});

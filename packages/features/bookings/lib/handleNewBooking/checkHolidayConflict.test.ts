import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { getHolidayService } from "@calcom/lib/holidays";
import { HolidayRepository } from "@calcom/lib/server/repository/HolidayRepository";

import { checkHolidayConflict, ensureNoHolidayConflict } from "./checkHolidayConflict";

// Mock the HolidayRepository
vi.mock("@calcom/lib/server/repository/HolidayRepository", () => ({
  HolidayRepository: {
    findUserSettingsSelect: vi.fn(),
  },
}));

// Mock the HolidayService
vi.mock("@calcom/lib/holidays", () => ({
  getHolidayService: vi.fn(() => ({
    getHolidayOnDate: vi.fn(),
  })),
}));

// Helper to create mock holiday settings (only the fields our code uses)
const mockHolidaySettings = (settings: { countryCode: string | null; disabledIds: string[] } | null) =>
  settings as never;

describe("checkHolidayConflict", () => {
  let mockHolidayServiceInstance: { getHolidayOnDate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHolidayServiceInstance = {
      getHolidayOnDate: vi.fn(),
    };
    vi.mocked(getHolidayService).mockReturnValue(mockHolidayServiceInstance as never);
  });

  it("should return no conflict when user has no holiday settings", async () => {
    vi.mocked(HolidayRepository.findUserSettingsSelect).mockResolvedValue(null);

    const result = await checkHolidayConflict({
      userId: 123,
      startTime: new Date("2025-12-25"),
    });

    expect(result).toEqual({ hasConflict: false });
    expect(mockHolidayServiceInstance.getHolidayOnDate).not.toHaveBeenCalled();
  });

  it("should return no conflict when user has no country selected", async () => {
    vi.mocked(HolidayRepository.findUserSettingsSelect).mockResolvedValue(
      mockHolidaySettings({ countryCode: null, disabledIds: [] })
    );

    const result = await checkHolidayConflict({
      userId: 123,
      startTime: new Date("2025-12-25"),
    });

    expect(result).toEqual({ hasConflict: false });
    expect(mockHolidayServiceInstance.getHolidayOnDate).not.toHaveBeenCalled();
  });

  it("should return no conflict when date is not a holiday", async () => {
    vi.mocked(HolidayRepository.findUserSettingsSelect).mockResolvedValue(
      mockHolidaySettings({ countryCode: "US", disabledIds: [] })
    );
    mockHolidayServiceInstance.getHolidayOnDate.mockResolvedValue(null);

    const result = await checkHolidayConflict({
      userId: 123,
      startTime: new Date("2025-12-26"), // Day after Christmas
    });

    expect(result).toEqual({ hasConflict: false });
    expect(mockHolidayServiceInstance.getHolidayOnDate).toHaveBeenCalledWith(
      new Date("2025-12-26"),
      "US",
      []
    );
  });

  it("should return conflict when date falls on an enabled holiday", async () => {
    vi.mocked(HolidayRepository.findUserSettingsSelect).mockResolvedValue(
      mockHolidaySettings({ countryCode: "US", disabledIds: [] })
    );
    mockHolidayServiceInstance.getHolidayOnDate.mockResolvedValue({
      id: "christmas_2025",
      name: "Christmas Day",
      date: "2025-12-25",
      year: 2025,
    });

    const result = await checkHolidayConflict({
      userId: 123,
      startTime: new Date("2025-12-25"),
    });

    expect(result).toEqual({
      hasConflict: true,
      holidayName: "Christmas Day",
    });
  });

  it("should return no conflict when holiday is disabled", async () => {
    vi.mocked(HolidayRepository.findUserSettingsSelect).mockResolvedValue(
      mockHolidaySettings({ countryCode: "US", disabledIds: ["christmas_2025"] })
    );
    // Service returns null because holiday is in disabledIds
    mockHolidayServiceInstance.getHolidayOnDate.mockResolvedValue(null);

    const result = await checkHolidayConflict({
      userId: 123,
      startTime: new Date("2025-12-25"),
    });

    expect(result).toEqual({ hasConflict: false });
    expect(mockHolidayServiceInstance.getHolidayOnDate).toHaveBeenCalledWith(new Date("2025-12-25"), "US", [
      "christmas_2025",
    ]);
  });
});

describe("ensureNoHolidayConflict", () => {
  let mockHolidayServiceInstance: { getHolidayOnDate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHolidayServiceInstance = {
      getHolidayOnDate: vi.fn(),
    };
    vi.mocked(getHolidayService).mockReturnValue(mockHolidayServiceInstance as never);
  });

  it("should not throw when no holiday conflict exists", async () => {
    vi.mocked(HolidayRepository.findUserSettingsSelect).mockResolvedValue(
      mockHolidaySettings({ countryCode: "US", disabledIds: [] })
    );
    mockHolidayServiceInstance.getHolidayOnDate.mockResolvedValue(null);

    await expect(
      ensureNoHolidayConflict({
        userIds: [123],
        startTime: new Date("2025-12-26"),
      })
    ).resolves.not.toThrow();
  });

  it("should throw BookingOnHoliday error when date falls on holiday", async () => {
    vi.mocked(HolidayRepository.findUserSettingsSelect).mockResolvedValue(
      mockHolidaySettings({ countryCode: "US", disabledIds: [] })
    );
    mockHolidayServiceInstance.getHolidayOnDate.mockResolvedValue({
      id: "christmas_2025",
      name: "Christmas Day",
      date: "2025-12-25",
      year: 2025,
    });

    await expect(
      ensureNoHolidayConflict({
        userIds: [123],
        startTime: new Date("2025-12-25"),
      })
    ).rejects.toThrow(ErrorCode.BookingOnHoliday);
  });

  it("should check all users and throw if any has holiday conflict", async () => {
    // First user has no holidays
    vi.mocked(HolidayRepository.findUserSettingsSelect)
      .mockResolvedValueOnce(null) // User 1 - no settings
      .mockResolvedValueOnce(mockHolidaySettings({ countryCode: "US", disabledIds: [] })); // User 2 - has holiday

    mockHolidayServiceInstance.getHolidayOnDate.mockResolvedValue({
      id: "christmas_2025",
      name: "Christmas Day",
      date: "2025-12-25",
      year: 2025,
    });

    await expect(
      ensureNoHolidayConflict({
        userIds: [123, 456],
        startTime: new Date("2025-12-25"),
      })
    ).rejects.toThrow(ErrorCode.BookingOnHoliday);
  });

  it("should pass if all users have no holiday conflicts", async () => {
    vi.mocked(HolidayRepository.findUserSettingsSelect)
      .mockResolvedValueOnce(mockHolidaySettings({ countryCode: "US", disabledIds: [] }))
      .mockResolvedValueOnce(mockHolidaySettings({ countryCode: "UK", disabledIds: [] }));

    mockHolidayServiceInstance.getHolidayOnDate.mockResolvedValue(null);

    await expect(
      ensureNoHolidayConflict({
        userIds: [123, 456],
        startTime: new Date("2025-12-26"),
      })
    ).resolves.not.toThrow();

    expect(HolidayRepository.findUserSettingsSelect).toHaveBeenCalledTimes(2);
  });

  it("should throw HttpError with status 400 and holiday name in data", async () => {
    vi.mocked(HolidayRepository.findUserSettingsSelect).mockResolvedValue(
      mockHolidaySettings({ countryCode: "US", disabledIds: [] })
    );
    mockHolidayServiceInstance.getHolidayOnDate.mockResolvedValue({
      id: "independence_day_2025",
      name: "Independence Day",
      date: "2025-07-04",
      year: 2025,
    });

    try {
      await ensureNoHolidayConflict({
        userIds: [123],
        startTime: new Date("2025-07-04"),
      });
      expect.fail("Should have thrown");
    } catch (error) {
      expect((error as Error).message).toBe(ErrorCode.BookingOnHoliday);
      expect((error as { statusCode?: number }).statusCode).toBe(400);
      expect((error as { data?: { holidayName?: string } }).data?.holidayName).toBe("Independence Day");
    }
  });
});

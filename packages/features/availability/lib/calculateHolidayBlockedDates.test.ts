import dayjs from "@calcom/dayjs";
import { getHolidayService } from "@calcom/lib/holidays";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserAvailabilityService } from "./getUserAvailability";

vi.mock("@calcom/lib/holidays", () => ({
  getHolidayService: vi.fn(() => ({
    getHolidayDatesInRange: vi.fn(),
  })),
}));

// Helper to create working hours with proper Date types for startTime/endTime
// Times are stored as Date objects with only time component (1970-01-01)
const createWorkingHours = (days: number[]) => ({
  days,
  startTime: new Date("1970-01-01T09:00:00.000Z"), // 9 AM
  endTime: new Date("1970-01-01T17:00:00.000Z"), // 5 PM
});

const mockHolidayRepo = {
  findUserSettingsSelect: vi.fn(),
};

const mockDependencies = {
  oooRepo: {} as never,
  bookingRepo: {} as never,
  redisClient: {} as never,
  eventTypeRepo: {} as never,
  holidayRepo: mockHolidayRepo as never,
};

describe("UserAvailabilityService.calculateHolidayBlockedDates", () => {
  let service: UserAvailabilityService;
  let mockHolidayService: { getHolidayDatesInRange: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserAvailabilityService(mockDependencies);
    mockHolidayService = {
      getHolidayDatesInRange: vi.fn(),
    };
    vi.mocked(getHolidayService).mockReturnValue(mockHolidayService as never);
  });

  it("should return empty object when user has no holiday settings", async () => {
    mockHolidayRepo.findUserSettingsSelect.mockResolvedValue(null);

    const result = await service.calculateHolidayBlockedDates(
      123,
      new Date("2025-01-01"),
      new Date("2025-01-31"),
      [createWorkingHours([1, 2, 3, 4, 5])] // Monday to Friday, 9am-5pm
    );

    expect(mockHolidayRepo.findUserSettingsSelect).toHaveBeenCalledWith({
      userId: 123,
      select: {
        countryCode: true,
        disabledIds: true,
      },
    });
    expect(result).toEqual({});
  });

  it("should return empty object when user has no country selected", async () => {
    mockHolidayRepo.findUserSettingsSelect.mockResolvedValue({
      countryCode: null,
      disabledIds: [],
    });

    const result = await service.calculateHolidayBlockedDates(
      123,
      new Date("2025-01-01"),
      new Date("2025-01-31"),
      [createWorkingHours([1, 2, 3, 4, 5])]
    );

    expect(result).toEqual({});
  });

  it("should return empty object when no holidays in date range", async () => {
    mockHolidayRepo.findUserSettingsSelect.mockResolvedValue({
      countryCode: "US",
      disabledIds: [],
    });

    mockHolidayService.getHolidayDatesInRange.mockResolvedValue([]);

    const result = await service.calculateHolidayBlockedDates(
      123,
      new Date("2025-02-01"),
      new Date("2025-02-28"),
      [createWorkingHours([1, 2, 3, 4, 5])]
    );

    // Dates are expanded to full day range (startOfDay to endOfDay in UTC)
    // to ensure holidays stored at midnight UTC are found
    expect(mockHolidayService.getHolidayDatesInRange).toHaveBeenCalledWith(
      "US",
      [],
      expect.any(Date),
      expect.any(Date)
    );
    // Verify the date range covers the full days
    const [, , startDate, endDate] = mockHolidayService.getHolidayDatesInRange.mock.calls[0];
    expect(startDate.toISOString()).toBe("2025-02-01T00:00:00.000Z");
    expect(endDate.toISOString()).toBe("2025-02-28T23:59:59.999Z");
    expect(result).toEqual({});
  });

  it("should return holiday data for dates that match user's working days", async () => {
    mockHolidayRepo.findUserSettingsSelect.mockResolvedValue({
      countryCode: "US",
      disabledIds: [],
    });

    // Wednesday, January 1, 2025 - New Year's Day
    mockHolidayService.getHolidayDatesInRange.mockResolvedValue([
      {
        date: "2025-01-01",
        holiday: {
          id: "new_years_day_2025",
          name: "New Year's Day",
          date: "2025-01-01",
          year: 2025,
        },
      },
    ]);

    const result = await service.calculateHolidayBlockedDates(
      123,
      new Date("2025-01-01"),
      new Date("2025-01-31"),
      [createWorkingHours([1, 2, 3, 4, 5])] // Monday(1) to Friday(5) - includes Wednesday(3)
    );

    expect(result).toEqual({
      "2025-01-01": {
        fromUser: null,
        toUser: null,
        reason: "New Year's Day",
        emoji: "🎆",
      },
    });
  });

  it("should skip holidays that fall on non-working days", async () => {
    mockHolidayRepo.findUserSettingsSelect.mockResolvedValue({
      countryCode: "US",
      disabledIds: [],
    });

    // Saturday, December 25, 2027 - Christmas Day
    const christmasDate = "2027-12-25";
    const christmasDayOfWeek = dayjs(christmasDate).day(); // Should be 6 (Saturday)

    mockHolidayService.getHolidayDatesInRange.mockResolvedValue([
      {
        date: christmasDate,
        holiday: {
          id: "christmas_2027",
          name: "Christmas Day",
          date: christmasDate,
          year: 2027,
        },
      },
    ]);

    // User only works Monday to Friday (days 1-5), not Saturday (6) or Sunday (0)
    const result = await service.calculateHolidayBlockedDates(
      123,
      new Date("2027-12-01"),
      new Date("2027-12-31"),
      [createWorkingHours([1, 2, 3, 4, 5])]
    );

    // Christmas 2027 is on Saturday (day 6), should be skipped
    expect(christmasDayOfWeek).toBe(6);
    expect(result).toEqual({});
  });

  it("should handle multiple holidays correctly", async () => {
    mockHolidayRepo.findUserSettingsSelect.mockResolvedValue({
      countryCode: "US",
      disabledIds: [],
    });

    mockHolidayService.getHolidayDatesInRange.mockResolvedValue([
      {
        date: "2025-01-01", // Wednesday
        holiday: {
          id: "new_years_day_2025",
          name: "New Year's Day",
          date: "2025-01-01",
          year: 2025,
        },
      },
      {
        date: "2025-01-20", // Monday - MLK Day
        holiday: {
          id: "mlk_day_2025",
          name: "Martin Luther King Jr. Day",
          date: "2025-01-20",
          year: 2025,
        },
      },
    ]);

    const result = await service.calculateHolidayBlockedDates(
      123,
      new Date("2025-01-01"),
      new Date("2025-01-31"),
      [createWorkingHours([1, 2, 3, 4, 5])]
    );

    expect(result).toEqual({
      "2025-01-01": {
        fromUser: null,
        toUser: null,
        reason: "New Year's Day",
        emoji: "🎆",
      },
      "2025-01-20": {
        fromUser: null,
        toUser: null,
        reason: "Martin Luther King Jr. Day",
        emoji: "✊",
      },
    });
  });

  it("should handle availability with multiple schedules", async () => {
    mockHolidayRepo.findUserSettingsSelect.mockResolvedValue({
      countryCode: "US",
      disabledIds: [],
    });

    // Thursday, July 4, 2024 - Independence Day
    mockHolidayService.getHolidayDatesInRange.mockResolvedValue([
      {
        date: "2024-07-04",
        holiday: {
          id: "independence_day_2024",
          name: "Independence Day",
          date: "2024-07-04",
          year: 2024,
        },
      },
    ]);

    // User has multiple availability schedules, some include Thursday (4)
    const result = await service.calculateHolidayBlockedDates(
      123,
      new Date("2024-07-01"),
      new Date("2024-07-31"),
      [
        createWorkingHours([1, 3]), // Monday, Wednesday only
        createWorkingHours([2, 4]), // Tuesday, Thursday - includes the holiday
      ]
    );

    expect(result).toEqual({
      "2024-07-04": {
        fromUser: null,
        toUser: null,
        reason: "Independence Day",
        emoji: "🎆",
      },
    });
  });

  it("should respect disabled holidays", async () => {
    mockHolidayRepo.findUserSettingsSelect.mockResolvedValue({
      countryCode: "US",
      disabledIds: ["christmas_2025"],
    });

    // The holiday service should receive the disabledIds and filter them out
    mockHolidayService.getHolidayDatesInRange.mockResolvedValue([
      {
        date: "2025-01-01",
        holiday: {
          id: "new_years_day_2025",
          name: "New Year's Day",
          date: "2025-01-01",
          year: 2025,
        },
      },
      // Christmas is NOT returned because it's in disabledIds
    ]);

    const result = await service.calculateHolidayBlockedDates(
      123,
      new Date("2025-01-01"),
      new Date("2025-12-31"),
      [createWorkingHours([1, 2, 3, 4, 5])]
    );

    // Verify disabledIds were passed to the service
    expect(mockHolidayService.getHolidayDatesInRange).toHaveBeenCalledWith(
      "US",
      ["christmas_2025"],
      expect.any(Date),
      expect.any(Date)
    );

    // Only New Year's Day should be blocked
    expect(result).toEqual({
      "2025-01-01": {
        fromUser: null,
        toUser: null,
        reason: "New Year's Day",
        emoji: "🎆",
      },
    });
  });
});

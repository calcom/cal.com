import { beforeEach, describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";

import { UserAvailabilityService } from "./getUserAvailability";

// Helper to create working hours with proper Date types for startTime/endTime
// Times are stored as Date objects with only time component (1970-01-01)
const createWorkingHours = (days: number[]) => ({
  days,
  startTime: new Date("1970-01-01T09:00:00.000Z"), // 9 AM
  endTime: new Date("1970-01-01T17:00:00.000Z"), // 5 PM
});

const mockDependencies = {
  oooRepo: {} as never,
  bookingRepo: {} as never,
  redisClient: {} as never,
  eventTypeRepo: {} as never,
  holidayRepo: {} as never,
};

const weekdays = [createWorkingHours([1, 2, 3, 4, 5])];

const newYears = {
  date: "2025-01-01",
  holiday: { id: "new_years_day_2025", name: "New Year's Day", date: "2025-01-01", year: 2025 },
};

const mlkDay = {
  date: "2025-01-20",
  holiday: { id: "mlk_day_2025", name: "Martin Luther King Jr. Day", date: "2025-01-20", year: 2025 },
};

const christmas = {
  date: "2027-12-25",
  holiday: { id: "christmas_2027", name: "Christmas Day", date: "2027-12-25", year: 2027 },
};

const independenceDay = {
  date: "2024-07-04",
  holiday: { id: "independence_day_2024", name: "Independence Day", date: "2024-07-04", year: 2024 },
};

describe("UserAvailabilityService.calculateHolidayBlockedDates", () => {
  let service: UserAvailabilityService;

  beforeEach(() => {
    service = new UserAvailabilityService(mockDependencies);
  });

  it("should return empty when holiday dates is null", () => {
    expect(service.calculateHolidayBlockedDates(weekdays, null, [])).toEqual({});
  });

  it("should return empty when no holidays provided", () => {
    expect(service.calculateHolidayBlockedDates(weekdays, [], [])).toEqual({});
  });

  it("should return holiday data for dates that match working days", () => {
    // Jan 1 2025 is Wednesday (day 3)
    const result = service.calculateHolidayBlockedDates(weekdays, [newYears], []);
    expect(result).toEqual({
      "2025-01-01": { fromUser: null, toUser: null, reason: "New Year's Day", emoji: "🎆" },
    });
  });

  it("should skip holidays that fall on non-working days", () => {
    // Dec 25 2027 is Saturday (day 6)
    expect(dayjs(christmas.date).day()).toBe(6);
    expect(service.calculateHolidayBlockedDates(weekdays, [christmas], [])).toEqual({});
  });

  it("should handle multiple holidays correctly", () => {
    const result = service.calculateHolidayBlockedDates(weekdays, [newYears, mlkDay], []);
    expect(result).toEqual({
      "2025-01-01": { fromUser: null, toUser: null, reason: "New Year's Day", emoji: "🎆" },
      "2025-01-20": { fromUser: null, toUser: null, reason: "Martin Luther King Jr. Day", emoji: "✊" },
    });
  });

  it("should handle multiple availability schedules", () => {
    // Jul 4 2024 is Thursday (day 4)
    const result = service.calculateHolidayBlockedDates(
      [createWorkingHours([1, 3]), createWorkingHours([2, 4])],
      [independenceDay],
      []
    );
    expect(result).toEqual({
      "2024-07-04": { fromUser: null, toUser: null, reason: "Independence Day", emoji: "🎆" },
    });
  });

  it("should filter out disabled holidays via disabledIds", () => {
    const result = service.calculateHolidayBlockedDates(weekdays, [newYears, mlkDay], ["mlk_day_2025"]);
    expect(result).toEqual({
      "2025-01-01": { fromUser: null, toUser: null, reason: "New Year's Day", emoji: "🎆" },
    });
  });

  it("should return empty when all holidays are disabled", () => {
    const result = service.calculateHolidayBlockedDates(weekdays, [newYears], ["new_years_day_2025"]);
    expect(result).toEqual({});
  });
});

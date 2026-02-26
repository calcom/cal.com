import { describe, expect, it } from "vitest";
import type { Schedule } from "./getScheduleListItemData";
import { getScheduleListItemData } from "./getScheduleListItemData";

function createSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 1,
    name: "Working Hours",
    isDefault: true,
    timeZone: "America/New_York",
    availability: [],
    ...overrides,
  };
}

describe("getScheduleListItemData", () => {
  it("converts startTime strings to Date objects", () => {
    const schedule = createSchedule({
      availability: [
        {
          id: 1,
          userId: 1,
          startTime: new Date("1970-01-01T09:00:00.000Z"),
          endTime: new Date("1970-01-01T17:00:00.000Z"),
          eventTypeId: null,
          date: null,
          days: [1, 2, 3, 4, 5],
          scheduleId: 1,
        },
      ],
    });

    const result = getScheduleListItemData(schedule);
    expect(result.availability[0].startTime).toBeInstanceOf(Date);
  });

  it("converts endTime strings to Date objects", () => {
    const schedule = createSchedule({
      availability: [
        {
          id: 1,
          userId: 1,
          startTime: new Date("1970-01-01T09:00:00.000Z"),
          endTime: new Date("1970-01-01T17:00:00.000Z"),
          eventTypeId: null,
          date: null,
          days: [1, 2, 3, 4, 5],
          scheduleId: 1,
        },
      ],
    });

    const result = getScheduleListItemData(schedule);
    expect(result.availability[0].endTime).toBeInstanceOf(Date);
  });

  it("converts date strings to Date objects when not null", () => {
    const schedule = createSchedule({
      availability: [
        {
          id: 1,
          userId: 1,
          startTime: new Date("1970-01-01T09:00:00.000Z"),
          endTime: new Date("1970-01-01T17:00:00.000Z"),
          eventTypeId: null,
          date: new Date("2026-03-15"),
          days: [],
          scheduleId: 1,
        },
      ],
    });

    const result = getScheduleListItemData(schedule);
    expect(result.availability[0].date).toBeInstanceOf(Date);
  });

  it("keeps date as null when originally null", () => {
    const schedule = createSchedule({
      availability: [
        {
          id: 1,
          userId: 1,
          startTime: new Date("1970-01-01T09:00:00.000Z"),
          endTime: new Date("1970-01-01T17:00:00.000Z"),
          eventTypeId: null,
          date: null,
          days: [1],
          scheduleId: 1,
        },
      ],
    });

    const result = getScheduleListItemData(schedule);
    expect(result.availability[0].date).toBeNull();
  });

  it("preserves other schedule properties", () => {
    const schedule = createSchedule({
      id: 42,
      name: "Custom Schedule",
      isDefault: false,
      timeZone: "Europe/London",
    });

    const result = getScheduleListItemData(schedule);
    expect(result.id).toBe(42);
    expect(result.name).toBe("Custom Schedule");
    expect(result.isDefault).toBe(false);
    expect(result.timeZone).toBe("Europe/London");
  });

  it("handles empty availability array", () => {
    const schedule = createSchedule({ availability: [] });
    const result = getScheduleListItemData(schedule);
    expect(result.availability).toEqual([]);
  });
});

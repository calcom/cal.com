import { describe, expect, it, vi } from "vitest";

import dayjs from "@calcom/dayjs";

import {
  transformAvailabilityForAtom,
  transformDateOverridesForAtom,
  transformScheduleToAvailabilityForAtom,
  transformWorkingHoursForAtom,
} from "./for-atom";

vi.mock("@calcom/lib/availability", () => ({
  getWorkingHours: vi.fn(
    (
      _timeZone: { timeZone: string | undefined; utcOffset: number },
      availability: { days: number[]; startTime: Date; endTime: Date }[]
    ) => {
      return availability.map((a) => ({
        days: a.days,
        startTime: a.startTime.getUTCHours() * 60 + a.startTime.getUTCMinutes(),
        endTime: a.endTime.getUTCHours() * 60 + a.endTime.getUTCMinutes(),
      }));
    }
  ),
}));

function makeTime(hours: number, minutes = 0): Date {
  return new Date(Date.UTC(2025, 0, 1, hours, minutes, 0, 0));
}

describe("transformWorkingHoursForAtom", () => {
  it("transforms availability with timezone", () => {
    const result = transformWorkingHoursForAtom({
      timeZone: "America/New_York",
      availability: [{ days: [1, 2, 3, 4, 5], startTime: makeTime(9, 0), endTime: makeTime(17, 0) }],
    });

    expect(result).toHaveLength(1);
    expect(result[0].days).toEqual([1, 2, 3, 4, 5]);
    expect(result[0].startTime).toBe(540);
    expect(result[0].endTime).toBe(1020);
  });

  it("handles null timezone", () => {
    const result = transformWorkingHoursForAtom({
      timeZone: null,
      availability: [{ days: [0, 6], startTime: makeTime(10, 0), endTime: makeTime(14, 0) }],
    });

    expect(result).toHaveLength(1);
    expect(result[0].days).toEqual([0, 6]);
  });

  it("handles empty availability", () => {
    const result = transformWorkingHoursForAtom({
      timeZone: "UTC",
      availability: [],
    });

    expect(result).toEqual([]);
  });

  it("handles multiple availability entries", () => {
    const result = transformWorkingHoursForAtom({
      timeZone: "UTC",
      availability: [
        { days: [1, 2, 3], startTime: makeTime(9, 0), endTime: makeTime(12, 0) },
        { days: [4, 5], startTime: makeTime(13, 0), endTime: makeTime(17, 0) },
      ],
    });

    expect(result).toHaveLength(2);
  });
});

describe("transformScheduleToAvailabilityForAtom", () => {
  it("maps availability to 7-day schedule array", () => {
    const result = transformScheduleToAvailabilityForAtom({
      availability: [{ days: [1, 3, 5], startTime: makeTime(9, 0), endTime: makeTime(17, 0) }],
    });

    expect(result).toHaveLength(7);
    expect(result[0]).toHaveLength(0); // Sunday
    expect(result[1]).toHaveLength(1); // Monday
    expect(result[2]).toHaveLength(0); // Tuesday
    expect(result[3]).toHaveLength(1); // Wednesday
    expect(result[4]).toHaveLength(0); // Thursday
    expect(result[5]).toHaveLength(1); // Friday
    expect(result[6]).toHaveLength(0); // Saturday
  });

  it("creates Date objects with correct UTC hours", () => {
    const result = transformScheduleToAvailabilityForAtom({
      availability: [{ days: [1], startTime: makeTime(9, 30), endTime: makeTime(17, 45) }],
    });

    const mondaySlots = result[1];
    expect(mondaySlots).toHaveLength(1);
    expect(mondaySlots[0].start.getUTCHours()).toBe(9);
    expect(mondaySlots[0].start.getUTCMinutes()).toBe(30);
    expect(mondaySlots[0].end.getUTCHours()).toBe(17);
    expect(mondaySlots[0].end.getUTCMinutes()).toBe(45);
  });

  it("handles multiple availability entries on the same day", () => {
    const result = transformScheduleToAvailabilityForAtom({
      availability: [
        { days: [1], startTime: makeTime(9, 0), endTime: makeTime(12, 0) },
        { days: [1], startTime: makeTime(13, 0), endTime: makeTime(17, 0) },
      ],
    });

    expect(result[1]).toHaveLength(2);
  });

  it("sorts day slots by start time", () => {
    const result = transformScheduleToAvailabilityForAtom({
      availability: [
        { days: [1], startTime: makeTime(13, 0), endTime: makeTime(17, 0) },
        { days: [1], startTime: makeTime(9, 0), endTime: makeTime(12, 0) },
      ],
    });

    expect(result[1][0].start.getUTCHours()).toBe(9);
    expect(result[1][1].start.getUTCHours()).toBe(13);
  });

  it("handles empty availability", () => {
    const result = transformScheduleToAvailabilityForAtom({
      availability: [],
    });

    expect(result).toHaveLength(7);
    result.forEach((day) => expect(day).toHaveLength(0));
  });
});

describe("transformAvailabilityForAtom", () => {
  it("replaces 23:59:00 with 23:59:59.999 for end times", () => {
    const result = transformAvailabilityForAtom({
      availability: [{ days: [1], startTime: makeTime(9, 0), endTime: makeTime(23, 59) }],
    });

    const endDate = result[1][0].end;
    expect(endDate.getUTCHours()).toBe(23);
    expect(endDate.getUTCMinutes()).toBe(59);
    expect(endDate.getUTCSeconds()).toBe(59);
    expect(endDate.getUTCMilliseconds()).toBe(999);
  });

  it("preserves non-23:59 end times", () => {
    const result = transformAvailabilityForAtom({
      availability: [{ days: [1], startTime: makeTime(9, 0), endTime: makeTime(17, 0) }],
    });

    const endDate = result[1][0].end;
    expect(endDate.getUTCHours()).toBe(17);
    expect(endDate.getUTCMinutes()).toBe(0);
  });
});

describe("transformDateOverridesForAtom", () => {
  const timeZone = "UTC";

  it("filters out past date overrides", () => {
    const pastDate = dayjs().subtract(10, "days").toDate();
    const result = transformDateOverridesForAtom(
      {
        availability: [
          {
            date: pastDate,
            startTime: makeTime(9, 0),
            endTime: makeTime(17, 0),
          },
        ],
      },
      timeZone
    );

    expect(result).toHaveLength(0);
  });

  it("includes future date overrides", () => {
    const futureDate = dayjs().add(10, "days").startOf("day").toDate();
    const result = transformDateOverridesForAtom(
      {
        availability: [
          {
            date: futureDate,
            startTime: makeTime(10, 0),
            endTime: makeTime(14, 0),
          },
        ],
      },
      timeZone
    );

    expect(result).toHaveLength(1);
    expect(result[0].ranges).toHaveLength(1);
  });

  it("groups overrides on the same day", () => {
    const futureDate = dayjs().add(10, "days").startOf("day").toDate();
    const result = transformDateOverridesForAtom(
      {
        availability: [
          { date: futureDate, startTime: makeTime(9, 0), endTime: makeTime(12, 0) },
          { date: futureDate, startTime: makeTime(13, 0), endTime: makeTime(17, 0) },
        ],
      },
      timeZone
    );

    expect(result).toHaveLength(1);
    expect(result[0].ranges).toHaveLength(2);
  });

  it("sorts overrides by date", () => {
    const date1 = dayjs().add(20, "days").startOf("day").toDate();
    const date2 = dayjs().add(10, "days").startOf("day").toDate();
    const result = transformDateOverridesForAtom(
      {
        availability: [
          { date: date1, startTime: makeTime(9, 0), endTime: makeTime(17, 0) },
          { date: date2, startTime: makeTime(9, 0), endTime: makeTime(17, 0) },
        ],
      },
      timeZone
    );

    expect(result).toHaveLength(2);
    expect(result[0].ranges[0].start.getTime()).toBeLessThan(result[1].ranges[0].start.getTime());
  });

  it("skips overrides with null date", () => {
    const result = transformDateOverridesForAtom(
      {
        availability: [
          {
            date: null,
            startTime: makeTime(9, 0),
            endTime: makeTime(17, 0),
          },
        ],
      },
      timeZone
    );

    expect(result).toHaveLength(0);
  });

  it("handles empty availability", () => {
    const result = transformDateOverridesForAtom({ availability: [] }, timeZone);
    expect(result).toHaveLength(0);
  });
});

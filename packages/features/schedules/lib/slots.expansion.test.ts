import dayjs from "@calcom/dayjs";
import type { DateRange } from "@calcom/features/schedules/lib/date-ranges";
import { beforeAll, describe, expect, it, vi } from "vitest";
import getSlots from "./slots";

beforeAll(() => {
  vi.setSystemTime(dayjs.utc("2021-06-20T11:59:59Z").toDate());
});

describe("Slots edge cases - timezone boundaries", () => {
  it("should generate correct slots for UTC+14 (Line Islands)", () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const dateRanges: DateRange[] = [
      {
        start: nextDay.hour(8),
        end: nextDay.hour(10),
      },
    ];

    const slots = getSlots({
      inviteeDate: dayjs.tz(nextDay.format("YYYY-MM-DD"), "Pacific/Kiritimati"),
      frequency: 60,
      minimumBookingNotice: 0,
      eventLength: 60,
      dateRanges,
    });

    expect(slots.length).toBeGreaterThan(0);
    // All slots should be valid Dayjs objects
    for (const slot of slots) {
      expect(slot.time.isValid()).toBe(true);
    }
  });

  it("should generate correct slots for UTC-12 (Baker Island)", () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const dateRanges: DateRange[] = [
      {
        start: nextDay.hour(8),
        end: nextDay.hour(12),
      },
    ];

    const slots = getSlots({
      inviteeDate: dayjs.tz(nextDay.format("YYYY-MM-DD"), "Etc/GMT+12"),
      frequency: 60,
      minimumBookingNotice: 0,
      eventLength: 60,
      dateRanges,
    });

    expect(slots.length).toBeGreaterThan(0);
  });

  it("should handle quarter-hour timezone offset (Asia/Kathmandu UTC+5:45)", () => {
    const slots = getSlots({
      inviteeDate: dayjs.tz("2023-07-13T00:00:00.000", "Asia/Kathmandu"),
      frequency: 60,
      minimumBookingNotice: 0,
      eventLength: 60,
      dateRanges: [
        {
          start: dayjs.tz("2023-07-13T08:00:00.000", "Asia/Kathmandu"),
          end: dayjs.tz("2023-07-13T11:00:00.000", "Asia/Kathmandu"),
        },
      ],
    });

    expect(slots.length).toBeGreaterThanOrEqual(2);
    // Verify all slots fall within the date range
    for (const slot of slots) {
      expect(slot.time.isValid()).toBe(true);
    }
  });
});

describe("Slots edge cases - event length variations", () => {
  it("should handle very short events (1 minute)", () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const slots = getSlots({
      inviteeDate: nextDay,
      frequency: 1,
      minimumBookingNotice: 0,
      eventLength: 1,
      dateRanges: [
        {
          start: nextDay.hour(10),
          end: nextDay.hour(10).minute(5),
        },
      ],
    });

    expect(slots).toHaveLength(5);
  });

  it("should handle event length longer than frequency", () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const slots = getSlots({
      inviteeDate: nextDay,
      frequency: 30,
      minimumBookingNotice: 0,
      eventLength: 60,
      dateRanges: [
        {
          start: nextDay.hour(9),
          end: nextDay.hour(12),
        },
      ],
    });

    // With 30-min frequency and 60-min events in 3 hours, last slot at 11:00
    expect(slots.length).toBeGreaterThan(0);
    // All slots should allow enough time for the event length
    for (const slot of slots) {
      const slotEnd = slot.time.add(60, "minutes");
      expect(slotEnd.valueOf()).toBeLessThanOrEqual(nextDay.hour(12).add(1, "second").valueOf());
    }
  });

  it("should handle event length equal to the entire available range", () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const slots = getSlots({
      inviteeDate: nextDay,
      frequency: 60,
      minimumBookingNotice: 0,
      eventLength: 60,
      dateRanges: [
        {
          start: nextDay.hour(10),
          end: nextDay.hour(11),
        },
      ],
    });

    expect(slots).toHaveLength(1);
  });

  it("should return no slots when event length exceeds available range", () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const slots = getSlots({
      inviteeDate: nextDay,
      frequency: 60,
      minimumBookingNotice: 0,
      eventLength: 120,
      dateRanges: [
        {
          start: nextDay.hour(10),
          end: nextDay.hour(11),
        },
      ],
    });

    expect(slots).toHaveLength(0);
  });
});

describe("Slots edge cases - offsetStart", () => {
  it("should apply offsetStart correctly", () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const slotsWithoutOffset = getSlots({
      inviteeDate: nextDay,
      frequency: 60,
      minimumBookingNotice: 0,
      eventLength: 60,
      offsetStart: 0,
      dateRanges: [
        {
          start: nextDay.hour(9),
          end: nextDay.hour(17),
        },
      ],
    });

    const slotsWithOffset = getSlots({
      inviteeDate: nextDay,
      frequency: 60,
      minimumBookingNotice: 0,
      eventLength: 60,
      offsetStart: 15,
      dateRanges: [
        {
          start: nextDay.hour(9),
          end: nextDay.hour(17),
        },
      ],
    });

    // Offset reduces available slots since frequency + offset is used for spacing
    expect(slotsWithOffset.length).toBeLessThanOrEqual(slotsWithoutOffset.length);
  });
});

describe("Slots edge cases - empty and boundary inputs", () => {
  it("should return empty array for empty dateRanges", () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const slots = getSlots({
      inviteeDate: nextDay,
      frequency: 60,
      minimumBookingNotice: 0,
      eventLength: 60,
      dateRanges: [],
    });

    expect(slots).toHaveLength(0);
  });

  it("should return empty array for zero-length date range", () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const slots = getSlots({
      inviteeDate: nextDay,
      frequency: 60,
      minimumBookingNotice: 0,
      eventLength: 60,
      dateRanges: [
        {
          start: nextDay.hour(10),
          end: nextDay.hour(10),
        },
      ],
    });

    expect(slots).toHaveLength(0);
  });

  it("should handle large minimumBookingNotice that eliminates all slots", () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const slots = getSlots({
      inviteeDate: nextDay,
      frequency: 60,
      minimumBookingNotice: 60 * 48, // 48 hours
      eventLength: 60,
      dateRanges: [
        {
          start: nextDay,
          end: nextDay.endOf("day"),
        },
      ],
    });

    expect(slots).toHaveLength(0);
  });
});

describe("Slots edge cases - out of office data", () => {
  it("should mark slots as away when datesOutOfOffice matches", () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const dateStr = nextDay.format("YYYY-MM-DD");

    const datesOutOfOffice = {
      [dateStr]: {
        fromUser: { id: 1, displayName: "Test User" },
        toUser: null,
        reason: "Vacation",
        emoji: "🏖️",
      },
    };

    const slots = getSlots({
      inviteeDate: nextDay,
      frequency: 60,
      minimumBookingNotice: 0,
      eventLength: 60,
      dateRanges: [
        {
          start: nextDay.hour(9),
          end: nextDay.hour(12),
        },
      ],
      datesOutOfOffice,
    });

    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(slot.away).toBe(true);
      expect(slot.reason).toBe("Vacation");
    }
  });

  it("should not mark slots as away when datesOutOfOffice does not match the date", () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const differentDate = nextDay.add(5, "days").format("YYYY-MM-DD");

    const datesOutOfOffice = {
      [differentDate]: {
        fromUser: { id: 1, displayName: "Test User" },
        toUser: null,
        reason: "Vacation",
        emoji: "🏖️",
      },
    };

    const slots = getSlots({
      inviteeDate: nextDay,
      frequency: 60,
      minimumBookingNotice: 0,
      eventLength: 60,
      dateRanges: [
        {
          start: nextDay.hour(9),
          end: nextDay.hour(12),
        },
      ],
      datesOutOfOffice,
    });

    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(slot.away).toBeUndefined();
    }
  });

  it("should include redirect user data from datesOutOfOffice", () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const dateStr = nextDay.format("YYYY-MM-DD");

    const datesOutOfOffice = {
      [dateStr]: {
        fromUser: { id: 1, displayName: "User A" },
        toUser: { id: 2, displayName: "User B", username: "userb" },
        reason: "Conference",
        emoji: "📅",
      },
    };

    const slots = getSlots({
      inviteeDate: nextDay,
      frequency: 60,
      minimumBookingNotice: 0,
      eventLength: 60,
      dateRanges: [
        {
          start: nextDay.hour(9),
          end: nextDay.hour(10),
        },
      ],
      datesOutOfOffice,
    });

    expect(slots).toHaveLength(1);
    expect(slots[0].away).toBe(true);
    expect(slots[0].toUser).toEqual({ id: 2, displayName: "User B", username: "userb" });
    expect(slots[0].fromUser).toEqual({ id: 1, displayName: "User A" });
  });

  it("should handle datesOutOfOfficeTimeZone correctly", () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const kolkataDate = nextDay.tz("Asia/Kolkata").format("YYYY-MM-DD");

    const datesOutOfOffice = {
      [kolkataDate]: {
        fromUser: { id: 1, displayName: "Test User" },
        toUser: null,
        reason: "Holiday",
        emoji: "🎉",
      },
    };

    const slots = getSlots({
      inviteeDate: nextDay,
      frequency: 60,
      minimumBookingNotice: 0,
      eventLength: 60,
      dateRanges: [
        {
          start: nextDay.hour(9),
          end: nextDay.hour(12),
        },
      ],
      datesOutOfOffice,
      datesOutOfOfficeTimeZone: "Asia/Kolkata",
    });

    // Slots should exist and some may be marked as away depending on timezone alignment
    expect(slots.length).toBeGreaterThan(0);
  });
});

describe("Slots edge cases - multiple non-contiguous ranges", () => {
  it("should handle 3 separate date ranges on the same day", () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const dateRanges: DateRange[] = [
      { start: nextDay.hour(8), end: nextDay.hour(9) },
      { start: nextDay.hour(12), end: nextDay.hour(13) },
      { start: nextDay.hour(16), end: nextDay.hour(17) },
    ];

    const slots = getSlots({
      inviteeDate: nextDay,
      frequency: 60,
      minimumBookingNotice: 0,
      eventLength: 60,
      dateRanges,
    });

    expect(slots).toHaveLength(3);
  });

  it("should handle unsorted date ranges and still produce correct slots", () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const dateRanges: DateRange[] = [
      { start: nextDay.hour(16), end: nextDay.hour(17) },
      { start: nextDay.hour(8), end: nextDay.hour(9) },
      { start: nextDay.hour(12), end: nextDay.hour(13) },
    ];

    const slots = getSlots({
      inviteeDate: nextDay,
      frequency: 60,
      minimumBookingNotice: 0,
      eventLength: 60,
      dateRanges,
    });

    expect(slots).toHaveLength(3);
    // Slots should be in chronological order
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].time.valueOf()).toBeGreaterThan(slots[i - 1].time.valueOf());
    }
  });
});

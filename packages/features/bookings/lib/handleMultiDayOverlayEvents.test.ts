import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";
import { BookingStatus } from "@calcom/prisma/enums";

import { handleMultiDayOverlayEvents } from "./handleMultiDayOverlayEvents";

describe("handleMultiDayOverlayEvents", () => {
  it("should handle single-day events without changes", () => {
    // Create a single-day event (same day start and end)
    const singleDayEvent = {
      start: new Date("2023-07-10T09:00:00"),
      end: new Date("2023-07-10T10:00:00"),
      title: "Morning Meeting",
    };

    const result = handleMultiDayOverlayEvents([singleDayEvent]);

    expect(result).toHaveLength(1);
    expect(result[0].start).toEqual(singleDayEvent.start);
    expect(result[0].end).toEqual(singleDayEvent.end);
    expect(result[0].title).toEqual(singleDayEvent.title);
  });

  it("should split multi-day events into separate day events", () => {
    // Create a 3-day event
    const multiDayEvent = {
      start: new Date("2023-07-10T14:00:00"),
      end: new Date("2023-07-12T16:00:00"),
      title: "Conference",
    };

    const result = handleMultiDayOverlayEvents([multiDayEvent]);

    expect(result).toHaveLength(3);

    // First day: should start at the original time, end at end of day
    expect(result[0].start).toEqual(multiDayEvent.start);
    expect(dayjs(result[0].end).format("YYYY-MM-DD HH:mm")).toEqual("2023-07-10 23:59");
    expect(result[0].title).toEqual(multiDayEvent.title);

    // Middle day: should be all day (start at beginning, end at end)
    expect(dayjs(result[1].start).format("YYYY-MM-DD HH:mm")).toEqual("2023-07-11 00:00");
    expect(dayjs(result[1].end).format("YYYY-MM-DD HH:mm")).toEqual("2023-07-11 23:59");

    // Last day: should start at beginning of day, end at original end time
    expect(dayjs(result[2].start).format("YYYY-MM-DD HH:mm")).toEqual("2023-07-12 00:00");
    expect(result[2].end).toEqual(multiDayEvent.end);

    // All events should have multiDayEvent information
    for (const event of result) {
      expect(event.options.multiDayEvent).toBeDefined();
      expect(event.options.multiDayEvent.start).toEqual(multiDayEvent.start);
      expect(event.options.multiDayEvent.end).toEqual(multiDayEvent.end);
      expect(event.options.status).toEqual(BookingStatus.ACCEPTED);
    }
  });

  it("should use 'Busy' as default title when not provided", () => {
    const eventWithoutTitle = {
      start: new Date("2023-07-10T09:00:00"),
      end: new Date("2023-07-10T10:00:00"),
    };

    const result = handleMultiDayOverlayEvents([eventWithoutTitle]);

    expect(result[0].title).toEqual("Busy");
  });

  // Edge case: Event that crosses midnight but has a total duration less than 24 hours
  it("should handle events that cross midnight", () => {
    const crossMidnightEvent = {
      start: new Date("2023-07-10T22:00:00"),
      end: new Date("2023-07-11T02:00:00"),
      title: "Late Night Meeting",
    };

    const result = handleMultiDayOverlayEvents([crossMidnightEvent]);

    expect(result).toHaveLength(2);

    expect(dayjs(result[0].start).format("YYYY-MM-DD HH:mm")).toEqual("2023-07-10 22:00");
    expect(dayjs(result[0].end).format("YYYY-MM-DD HH:mm")).toEqual("2023-07-10 23:59");

    expect(dayjs(result[1].start).format("YYYY-MM-DD HH:mm")).toEqual("2023-07-11 00:00");
    expect(dayjs(result[1].end).format("YYYY-MM-DD HH:mm")).toEqual("2023-07-11 02:00");

    expect(result[0].options.multiDayEvent.start).toEqual(crossMidnightEvent.start);
    expect(result[0].options.multiDayEvent.end).toEqual(crossMidnightEvent.end);
  });
});

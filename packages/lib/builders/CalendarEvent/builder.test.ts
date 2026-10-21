import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarEventBuilder } from "./builder";

describe("CalendarEventBuilder - buildUIDCalendarEvent", () => {
  beforeEach(() => {
    // Freeze system time to simulate concurrent calls landing on the exact same millisecond
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-30T09:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("generates a valid non-empty uid for a calendar event", () => {
    const builder = new CalendarEventBuilder();
    builder.setUsers([
      {
        id: 1,
        username: "pro-user",
        email: "pro@example.com",
        name: "Pro User",
        locale: "en",
        timeZone: "UTC",
        credentials: [],
        bufferTime: 0,
        destinationCalendar: null,
      },
    ]);
    builder.calendarEvent.startTime = "2026-11-30T09:00:00Z";

    builder.buildUIDCalendarEvent();

    expect(builder.calendarEvent.uid).toBeDefined();
    expect(typeof builder.calendarEvent.uid).toBe("string");
    expect(builder.calendarEvent.uid?.length).toBeGreaterThan(0);
  });

  it("produces collision-safe unique uids across concurrent calls in the same millisecond (#30376)", () => {
    const builder1 = new CalendarEventBuilder();
    const builder2 = new CalendarEventBuilder();

    const mockUser = {
      id: 1,
      username: "pro-user",
      email: "pro@example.com",
      name: "Pro User",
      locale: "en",
      timeZone: "UTC",
      credentials: [],
      bufferTime: 0,
      destinationCalendar: null,
    };

    builder1.setUsers([mockUser]);
    builder1.calendarEvent.startTime = "2026-11-30T09:00:00Z";

    builder2.setUsers([mockUser]);
    builder2.calendarEvent.startTime = "2026-11-30T09:00:00Z";

    builder1.buildUIDCalendarEvent();
    builder2.buildUIDCalendarEvent();

    expect(builder1.calendarEvent.uid).not.toBe(builder2.calendarEvent.uid);
  });
});

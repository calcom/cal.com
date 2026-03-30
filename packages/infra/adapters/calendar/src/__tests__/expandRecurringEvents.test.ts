import { describe, expect, it } from "vitest";

import { expandVEventsFromICal } from "../lib/expandRecurringEvents";

const SINGLE_EVENT = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:single-1
DTSTART:20260115T100000Z
DTEND:20260115T110000Z
SUMMARY:Single Event
END:VEVENT
END:VCALENDAR`;

const WEEKLY_RECURRING = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:recurring-1
DTSTART:20260105T090000Z
DTEND:20260105T100000Z
RRULE:FREQ=WEEKLY;COUNT=10
SUMMARY:Weekly Meeting
END:VEVENT
END:VCALENDAR`;

const DAILY_RECURRING = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:recurring-daily
DTSTART:20260110T140000Z
DTEND:20260110T150000Z
RRULE:FREQ=DAILY;COUNT=5
SUMMARY:Daily Standup
END:VEVENT
END:VCALENDAR`;

const MINUTELY_RECURRING = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:minutely-1
DTSTART:20260115T100000Z
DTEND:20260115T100500Z
RRULE:FREQ=MINUTELY;COUNT=100
SUMMARY:Minutely Event
END:VEVENT
END:VCALENDAR`;

const WITH_TIMEZONE = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VTIMEZONE
TZID:America/New_York
BEGIN:STANDARD
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
TZNAME:EST
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
TZNAME:EDT
END:DAYLIGHT
END:VTIMEZONE
BEGIN:VEVENT
UID:tz-recurring
DTSTART;TZID=America/New_York:20260112T090000
DTEND;TZID=America/New_York:20260112T100000
RRULE:FREQ=WEEKLY;COUNT=4
SUMMARY:NYC Weekly
END:VEVENT
END:VCALENDAR`;

const WEEKLY_BYDAY = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:byday-1
DTSTART:20260105T090000Z
DTEND:20260105T100000Z
RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=12
SUMMARY:MWF Standup
END:VEVENT
END:VCALENDAR`;

const MONTHLY_BYDAY_2ND_TUESDAY = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:monthly-byday-1
DTSTART:20260113T100000Z
DTEND:20260113T110000Z
RRULE:FREQ=MONTHLY;BYDAY=2TU;COUNT=6
SUMMARY:2nd Tuesday Monthly
END:VEVENT
END:VCALENDAR`;

const WITH_EXDATE = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:exdate-1
DTSTART:20260105T090000Z
DTEND:20260105T100000Z
RRULE:FREQ=WEEKLY;COUNT=4
EXDATE:20260112T090000Z
SUMMARY:Weekly with exception
END:VEVENT
END:VCALENDAR`;

const MONTHLY_BYMONTHDAY = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:bymonthday-1
DTSTART:20260115T120000Z
DTEND:20260115T130000Z
RRULE:FREQ=MONTHLY;BYMONTHDAY=15;COUNT=4
SUMMARY:15th of each month
END:VEVENT
END:VCALENDAR`;

const DST_BOUNDARY = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VTIMEZONE
TZID:America/New_York
BEGIN:STANDARD
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
TZNAME:EST
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
TZNAME:EDT
END:DAYLIGHT
END:VTIMEZONE
BEGIN:VEVENT
UID:dst-1
DTSTART;TZID=America/New_York:20260301T090000
DTEND;TZID=America/New_York:20260301T100000
RRULE:FREQ=WEEKLY;COUNT=4
SUMMARY:Spans DST change
END:VEVENT
END:VCALENDAR`;

const INVALID_ICAL = `NOT A VALID ICAL FILE`;

const EMPTY_CALENDAR = `BEGIN:VCALENDAR
VERSION:2.0
END:VCALENDAR`;

const MULTIPLE_EVENTS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:multi-1
DTSTART:20260115T100000Z
DTEND:20260115T110000Z
SUMMARY:Event One
END:VEVENT
BEGIN:VEVENT
UID:multi-2
DTSTART:20260120T140000Z
DTEND:20260120T150000Z
SUMMARY:Event Two
END:VEVENT
END:VCALENDAR`;

describe("expandVEventsFromICal", () => {
  describe("single events", () => {
    it("returns a single slot for a non-recurring event within range", () => {
      const slots = expandVEventsFromICal(
        SINGLE_EVENT,
        new Date("2026-01-01T00:00:00Z"),
        new Date("2026-01-31T23:59:59Z")
      );

      expect(slots).toHaveLength(1);
      expect(slots[0].start).toEqual(new Date("2026-01-15T10:00:00Z"));
      expect(slots[0].end).toEqual(new Date("2026-01-15T11:00:00Z"));
    });

    it("returns empty for a single event outside the range", () => {
      const slots = expandVEventsFromICal(
        SINGLE_EVENT,
        new Date("2026-02-01T00:00:00Z"),
        new Date("2026-02-28T23:59:59Z")
      );

      expect(slots).toHaveLength(0);
    });

    it("handles multiple non-recurring events", () => {
      const slots = expandVEventsFromICal(
        MULTIPLE_EVENTS,
        new Date("2026-01-01T00:00:00Z"),
        new Date("2026-01-31T23:59:59Z")
      );

      expect(slots).toHaveLength(2);
    });
  });

  describe("recurring events", () => {
    it("expands weekly recurring events within range", () => {
      // WEEKLY starting Jan 5, COUNT=10 → Jan 5,12,19,26, Feb 2,9,16,23, Mar 2,9
      // Query range: Jan 1 - Jan 31 → should get 4 occurrences
      const slots = expandVEventsFromICal(
        WEEKLY_RECURRING,
        new Date("2026-01-01T00:00:00Z"),
        new Date("2026-01-31T23:59:59Z")
      );

      expect(slots.length).toBeGreaterThanOrEqual(4);

      for (const slot of slots) {
        expect(slot.start.getHours()).toBe(9);
        expect(slot.end.getHours()).toBe(10);
      }
    });

    it("expands daily recurring events", () => {
      // DAILY starting Jan 10, COUNT=5 → Jan 10,11,12,13,14
      const slots = expandVEventsFromICal(
        DAILY_RECURRING,
        new Date("2026-01-10T00:00:00Z"),
        new Date("2026-01-20T23:59:59Z")
      );

      expect(slots).toHaveLength(5);
    });

    it("skips MINUTELY frequency", () => {
      const slots = expandVEventsFromICal(
        MINUTELY_RECURRING,
        new Date("2026-01-15T00:00:00Z"),
        new Date("2026-01-15T23:59:59Z")
      );

      expect(slots).toHaveLength(0);
    });

    it("only returns occurrences within the query range", () => {
      // WEEKLY starting Jan 5, query only Feb
      const slots = expandVEventsFromICal(
        WEEKLY_RECURRING,
        new Date("2026-02-01T00:00:00Z"),
        new Date("2026-02-28T23:59:59Z")
      );

      for (const slot of slots) {
        expect(slot.start.getMonth()).toBe(1); // February
      }
    });
  });

  describe("timezone handling", () => {
    it("expands timezone-aware recurring events", () => {
      const slots = expandVEventsFromICal(
        WITH_TIMEZONE,
        new Date("2026-01-01T00:00:00Z"),
        new Date("2026-02-28T23:59:59Z")
      );

      expect(slots.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("RRULE modifiers", () => {
    it("expands WEEKLY with BYDAY (MO,WE,FR)", () => {
      // WEEKLY;BYDAY=MO,WE,FR starting Jan 5 (Mon), COUNT=12
      // Jan: 5(M),7(W),9(F),12(M),14(W),16(F),19(M),21(W),23(F),26(M),28(W),30(F)
      const slots = expandVEventsFromICal(
        WEEKLY_BYDAY,
        new Date("2026-01-01T00:00:00Z"),
        new Date("2026-01-31T23:59:59Z")
      );

      expect(slots.length).toBeGreaterThanOrEqual(3);

      for (const slot of slots) {
        const day = slot.start.getUTCDay();
        // 1=Mon, 3=Wed, 5=Fri
        expect([1, 3, 5]).toContain(day);
      }
    });

    it("expands MONTHLY with BYDAY=2TU (2nd Tuesday)", () => {
      // 2nd Tuesday: Jan 13, Feb 10, Mar 10, Apr 14, May 12, Jun 9
      const slots = expandVEventsFromICal(
        MONTHLY_BYDAY_2ND_TUESDAY,
        new Date("2026-01-01T00:00:00Z"),
        new Date("2026-06-30T23:59:59Z")
      );

      expect(slots.length).toBeGreaterThanOrEqual(1);

      for (const slot of slots) {
        // All occurrences should be on a Tuesday
        expect(slot.start.getUTCDay()).toBe(2);
      }
    });

    it("skips EXDATE occurrences", () => {
      // WEEKLY starting Jan 5, COUNT=4 with EXDATE on Jan 12
      // Should get Jan 5, 19, 26 (3 occurrences, not 4)
      const slots = expandVEventsFromICal(
        WITH_EXDATE,
        new Date("2026-01-01T00:00:00Z"),
        new Date("2026-01-31T23:59:59Z")
      );

      expect(slots).toHaveLength(3);

      const dates = slots.map((s) => s.start.toISOString());
      expect(dates).not.toContain("2026-01-12T09:00:00.000Z");
    });

    it("expands MONTHLY with BYMONTHDAY=15", () => {
      // 15th of each month: Jan 15, Feb 15, Mar 15, Apr 15
      const slots = expandVEventsFromICal(
        MONTHLY_BYMONTHDAY,
        new Date("2026-01-01T00:00:00Z"),
        new Date("2026-04-30T23:59:59Z")
      );

      expect(slots.length).toBeGreaterThanOrEqual(1);

      for (const slot of slots) {
        expect(slot.start.getUTCDate()).toBe(15);
      }
    });
  });

  describe("DST boundary", () => {
    it("expands events spanning a DST transition", () => {
      // DST in America/New_York: March 8, 2026 at 2:00 AM
      // Weekly from March 1: March 1 (EST), 8 (EDT), 15, 22
      const slots = expandVEventsFromICal(
        DST_BOUNDARY,
        new Date("2026-02-28T00:00:00Z"),
        new Date("2026-03-31T23:59:59Z")
      );

      expect(slots.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("edge cases", () => {
    it("returns empty for invalid iCal data", () => {
      const slots = expandVEventsFromICal(
        INVALID_ICAL,
        new Date("2026-01-01"),
        new Date("2026-01-31")
      );

      expect(slots).toHaveLength(0);
    });

    it("returns empty for calendar with no events", () => {
      const slots = expandVEventsFromICal(
        EMPTY_CALENDAR,
        new Date("2026-01-01"),
        new Date("2026-01-31")
      );

      expect(slots).toHaveLength(0);
    });
  });
});

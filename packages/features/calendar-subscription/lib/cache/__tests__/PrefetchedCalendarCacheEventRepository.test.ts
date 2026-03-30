import type { CalendarCacheEvent } from "@calcom/prisma/client";
import { describe, expect, test } from "vitest";

import { PrefetchedCalendarCacheEventRepository } from "../PrefetchedCalendarCacheEventRepository";

type CachedEvent = Pick<CalendarCacheEvent, "start" | "end" | "timeZone" | "selectedCalendarId">;

function makeEvent(
  calendarId: string,
  start: string,
  end: string,
  timeZone = "UTC"
): CachedEvent {
  return {
    selectedCalendarId: calendarId,
    start: new Date(start),
    end: new Date(end),
    timeZone,
  };
}

describe("PrefetchedCalendarCacheEventRepository", () => {
  describe("findAllBySelectedCalendarIdsBetween", () => {
    const rangeStart = new Date("2023-12-01T09:00:00Z");
    const rangeEnd = new Date("2023-12-01T17:00:00Z");

    test("returns events that overlap the date range", async () => {
      const event = makeEvent("cal-1", "2023-12-01T10:00:00Z", "2023-12-01T11:00:00Z");
      const repo = new PrefetchedCalendarCacheEventRepository([event]);

      const result = await repo.findAllBySelectedCalendarIdsBetween(["cal-1"], rangeStart, rangeEnd);

      expect(result).toEqual([event]);
    });

    test("excludes events entirely before the range", async () => {
      const event = makeEvent("cal-1", "2023-12-01T07:00:00Z", "2023-12-01T08:00:00Z");
      const repo = new PrefetchedCalendarCacheEventRepository([event]);

      const result = await repo.findAllBySelectedCalendarIdsBetween(["cal-1"], rangeStart, rangeEnd);

      expect(result).toEqual([]);
    });

    test("excludes events entirely after the range", async () => {
      const event = makeEvent("cal-1", "2023-12-01T18:00:00Z", "2023-12-01T19:00:00Z");
      const repo = new PrefetchedCalendarCacheEventRepository([event]);

      const result = await repo.findAllBySelectedCalendarIdsBetween(["cal-1"], rangeStart, rangeEnd);

      expect(result).toEqual([]);
    });

    test("includes events that partially overlap the start of the range", async () => {
      const event = makeEvent("cal-1", "2023-12-01T08:00:00Z", "2023-12-01T10:00:00Z");
      const repo = new PrefetchedCalendarCacheEventRepository([event]);

      const result = await repo.findAllBySelectedCalendarIdsBetween(["cal-1"], rangeStart, rangeEnd);

      expect(result).toEqual([event]);
    });

    test("includes events that partially overlap the end of the range", async () => {
      const event = makeEvent("cal-1", "2023-12-01T16:00:00Z", "2023-12-01T18:00:00Z");
      const repo = new PrefetchedCalendarCacheEventRepository([event]);

      const result = await repo.findAllBySelectedCalendarIdsBetween(["cal-1"], rangeStart, rangeEnd);

      expect(result).toEqual([event]);
    });

    test("includes events that fully contain the range", async () => {
      const event = makeEvent("cal-1", "2023-12-01T06:00:00Z", "2023-12-01T20:00:00Z");
      const repo = new PrefetchedCalendarCacheEventRepository([event]);

      const result = await repo.findAllBySelectedCalendarIdsBetween(["cal-1"], rangeStart, rangeEnd);

      expect(result).toEqual([event]);
    });

    test("excludes events where end equals range start (no overlap)", async () => {
      const event = makeEvent("cal-1", "2023-12-01T08:00:00Z", "2023-12-01T09:00:00Z");
      const repo = new PrefetchedCalendarCacheEventRepository([event]);

      const result = await repo.findAllBySelectedCalendarIdsBetween(["cal-1"], rangeStart, rangeEnd);

      expect(result).toEqual([]);
    });

    test("excludes events where start equals range end (no overlap)", async () => {
      const event = makeEvent("cal-1", "2023-12-01T17:00:00Z", "2023-12-01T18:00:00Z");
      const repo = new PrefetchedCalendarCacheEventRepository([event]);

      const result = await repo.findAllBySelectedCalendarIdsBetween(["cal-1"], rangeStart, rangeEnd);

      expect(result).toEqual([]);
    });

    test("filters by selected calendar IDs", async () => {
      const eventCal1 = makeEvent("cal-1", "2023-12-01T10:00:00Z", "2023-12-01T11:00:00Z");
      const eventCal2 = makeEvent("cal-2", "2023-12-01T10:00:00Z", "2023-12-01T11:00:00Z");
      const eventCal3 = makeEvent("cal-3", "2023-12-01T10:00:00Z", "2023-12-01T11:00:00Z");
      const repo = new PrefetchedCalendarCacheEventRepository([eventCal1, eventCal2, eventCal3]);

      const result = await repo.findAllBySelectedCalendarIdsBetween(
        ["cal-1", "cal-3"],
        rangeStart,
        rangeEnd
      );

      expect(result).toEqual([eventCal1, eventCal3]);
    });

    test("returns empty array for unknown calendar IDs", async () => {
      const event = makeEvent("cal-1", "2023-12-01T10:00:00Z", "2023-12-01T11:00:00Z");
      const repo = new PrefetchedCalendarCacheEventRepository([event]);

      const result = await repo.findAllBySelectedCalendarIdsBetween(
        ["unknown-cal"],
        rangeStart,
        rangeEnd
      );

      expect(result).toEqual([]);
    });

    test("returns empty array when no events are prefetched", async () => {
      const repo = new PrefetchedCalendarCacheEventRepository([]);

      const result = await repo.findAllBySelectedCalendarIdsBetween(["cal-1"], rangeStart, rangeEnd);

      expect(result).toEqual([]);
    });

    test("combines date range and calendar ID filtering", async () => {
      const inRange = makeEvent("cal-1", "2023-12-01T10:00:00Z", "2023-12-01T11:00:00Z");
      const outOfRange = makeEvent("cal-1", "2023-12-01T18:00:00Z", "2023-12-01T19:00:00Z");
      const wrongCal = makeEvent("cal-2", "2023-12-01T10:00:00Z", "2023-12-01T11:00:00Z");
      const repo = new PrefetchedCalendarCacheEventRepository([inRange, outOfRange, wrongCal]);

      const result = await repo.findAllBySelectedCalendarIdsBetween(["cal-1"], rangeStart, rangeEnd);

      expect(result).toEqual([inRange]);
    });

    test("returns only in-range events when a calendar has a mix of in-range and out-of-range events", async () => {
      const before = makeEvent("cal-1", "2023-12-01T07:00:00Z", "2023-12-01T08:00:00Z");
      const morning = makeEvent("cal-1", "2023-12-01T10:00:00Z", "2023-12-01T11:00:00Z");
      const afternoon = makeEvent("cal-1", "2023-12-01T14:00:00Z", "2023-12-01T15:00:00Z");
      const after = makeEvent("cal-1", "2023-12-01T18:00:00Z", "2023-12-01T19:00:00Z");
      const repo = new PrefetchedCalendarCacheEventRepository([before, morning, afternoon, after]);

      const result = await repo.findAllBySelectedCalendarIdsBetween(["cal-1"], rangeStart, rangeEnd);

      expect(result).toEqual([morning, afternoon]);
    });

    test("includes event whose start and end exactly match the range", async () => {
      const event = makeEvent("cal-1", "2023-12-01T09:00:00Z", "2023-12-01T17:00:00Z");
      const repo = new PrefetchedCalendarCacheEventRepository([event]);

      const result = await repo.findAllBySelectedCalendarIdsBetween(["cal-1"], rangeStart, rangeEnd);

      expect(result).toEqual([event]);
    });

    test("excludes zero-duration event at range start boundary", async () => {
      const event = makeEvent("cal-1", "2023-12-01T09:00:00Z", "2023-12-01T09:00:00Z");
      const repo = new PrefetchedCalendarCacheEventRepository([event]);

      const result = await repo.findAllBySelectedCalendarIdsBetween(["cal-1"], rangeStart, rangeEnd);

      expect(result).toEqual([]);
    });

    test("filters across multiple calendars independently", async () => {
      const cal1InRange = makeEvent("cal-1", "2023-12-01T10:00:00Z", "2023-12-01T11:00:00Z");
      const cal1OutOfRange = makeEvent("cal-1", "2023-12-01T18:00:00Z", "2023-12-01T19:00:00Z");
      const cal2InRange = makeEvent("cal-2", "2023-12-01T14:00:00Z", "2023-12-01T15:00:00Z");
      const cal2OutOfRange = makeEvent("cal-2", "2023-12-01T06:00:00Z", "2023-12-01T07:00:00Z");
      const repo = new PrefetchedCalendarCacheEventRepository([
        cal1InRange,
        cal1OutOfRange,
        cal2InRange,
        cal2OutOfRange,
      ]);

      const result = await repo.findAllBySelectedCalendarIdsBetween(
        ["cal-1", "cal-2"],
        rangeStart,
        rangeEnd
      );

      expect(result).toEqual([cal1InRange, cal2InRange]);
    });
  });

  describe("write operations are no-ops", () => {
    test("upsertMany resolves without error", async () => {
      const repo = new PrefetchedCalendarCacheEventRepository([]);
      await expect(repo.upsertMany([])).resolves.toBeUndefined();
    });

    test("deleteMany resolves without error", async () => {
      const repo = new PrefetchedCalendarCacheEventRepository([]);
      await expect(repo.deleteMany([])).resolves.toBeUndefined();
    });

    test("deleteAllBySelectedCalendarId resolves without error", async () => {
      const repo = new PrefetchedCalendarCacheEventRepository([]);
      await expect(repo.deleteAllBySelectedCalendarId("cal-1")).resolves.toBeUndefined();
    });

    test("deleteStale resolves without error", async () => {
      const repo = new PrefetchedCalendarCacheEventRepository([]);
      await expect(repo.deleteStale()).resolves.toBeUndefined();
    });
  });
});

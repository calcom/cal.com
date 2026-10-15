import type { EventBusyDate } from "@calcom/types/Calendar";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BuildCalendarService from "./CalendarService";

vi.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: () => JSON.stringify({ urls: ["https://feed.test/calendar.ics"] }),
}));

const VTIMEZONE_PARIS = `BEGIN:VTIMEZONE
TZID:Europe/Paris
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE`;

const vevent = (summary: string, start: string, end: string, ...extra: string[]) =>
  [
    "BEGIN:VEVENT",
    `UID:${summary}`,
    `SUMMARY:${summary}`,
    `DTSTART;TZID=Europe/Paris:${start}`,
    `DTEND;TZID=Europe/Paris:${end}`,
    ...extra,
    "END:VEVENT",
  ].join("\n");

const FEED = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//test//EN",
  VTIMEZONE_PARIS,
  // Monday series, no BYDAY: the weekday can only come from DTSTART
  vevent("weekly", "20250825T143000", "20250825T160000", "RRULE:FREQ=WEEKLY"),
  vevent("weekly-count", "20250825T143000", "20250825T160000", "RRULE:FREQ=WEEKLY;COUNT=3"),
  vevent("weekly-byday", "20250902T090000", "20250902T093000", "RRULE:FREQ=WEEKLY;BYDAY=TU,TH"),
  vevent(
    "daily-exdate",
    "20261001T120000",
    "20261001T123000",
    "RRULE:FREQ=DAILY",
    "EXDATE;TZID=Europe/Paris:20261029T120000"
  ),
  vevent("weekly-until", "20251201T100000", "20251201T103000", "RRULE:FREQ=WEEKLY;UNTIL=20260503T000000Z"),
  vevent("single", "20261029T100000", "20261029T110000"),
  // Sub-daily rules are skipped on purpose: walked from DTSTART they are slow and cut off by the 5000 cap
  vevent("hourly", "20261028T100000", "20261028T103000", "RRULE:FREQ=HOURLY"),
  vevent("minutely", "20261028T100000", "20261028T100500", "RRULE:FREQ=MINUTELY"),
  // Series old enough to need the skip-ahead (more than 5000 occurrences before the window)
  vevent("daily-2005", "20050103T090000", "20050103T093000", "RRULE:FREQ=DAILY"),
  vevent(
    "daily-2005-exdate",
    "20050103T090000",
    "20050103T093000",
    "RRULE:FREQ=DAILY",
    "EXDATE;TZID=Europe/Paris:20261029T090000"
  ),
  vevent("weekdays-2005", "20050103T090000", "20050103T093000", "RRULE:FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR"),
  vevent("every-2-days", "20250101T120000", "20250101T123000", "RRULE:FREQ=DAILY;INTERVAL=2"),
  vevent("every-2-weeks", "20250825T143000", "20250825T160000", "RRULE:FREQ=WEEKLY;INTERVAL=2"),
  "END:VCALENDAR",
].join("\n");

// Busy periods of one feed event over a whole UTC day, as "start/end".
const busyOn = async (title: string, day: string) => {
  const service = BuildCalendarService({ key: "key" } as Parameters<typeof BuildCalendarService>[0]);
  const busy = await service.getAvailability({
    dateFrom: `${day}T00:00:00.000Z`,
    dateTo: `${day}T23:59:59.000Z`,
    selectedCalendars: [],
    mode: "slots",
  });
  // the service adds the VEVENT title although EventBusyDate does not declare it
  return (busy as (EventBusyDate & { title: string })[])
    .filter((b) => b.title === title)
    .map((b) => `${b.start}/${b.end}`);
};

describe("ICS feed getAvailability", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(FEED))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("weekly RRULE without BYDAY", () => {
    it("is not busy on a weekday other than the DTSTART weekday", async () => {
      expect(await busyOn("weekly", "2026-10-29")).toEqual([]);
    });

    it("is busy on the DTSTART weekday", async () => {
      expect(await busyOn("weekly", "2026-11-02")).toEqual([
        "2026-11-02T13:30:00.000Z/2026-11-02T15:00:00.000Z",
      ]);
    });

    it("counts COUNT from DTSTART, not from the queried window", async () => {
      expect(await busyOn("weekly-count", "2026-11-02")).toEqual([]);
    });
  });

  it("keeps BYDAY occurrences on their weekdays", async () => {
    expect(await busyOn("weekly-byday", "2026-10-29")).toEqual([
      "2026-10-29T08:00:00.000Z/2026-10-29T08:30:00.000Z",
    ]);
    expect(await busyOn("weekly-byday", "2026-10-28")).toEqual([]);
  });

  it("skips EXDATE occurrences", async () => {
    expect(await busyOn("daily-exdate", "2026-10-28")).toEqual([
      "2026-10-28T11:00:00.000Z/2026-10-28T11:30:00.000Z",
    ]);
    expect(await busyOn("daily-exdate", "2026-10-29")).toEqual([]);
  });

  it("stops at UNTIL", async () => {
    expect(await busyOn("weekly-until", "2026-02-02")).toEqual([
      "2026-02-02T09:00:00.000Z/2026-02-02T09:30:00.000Z",
    ]);
    expect(await busyOn("weekly-until", "2026-10-26")).toEqual([]);
  });

  describe("long-running series", () => {
    it("reaches a window more than 5000 occurrences after DTSTART", async () => {
      expect(await busyOn("daily-2005", "2026-10-28")).toEqual([
        "2026-10-28T08:00:00.000Z/2026-10-28T08:30:00.000Z",
      ]);
    });

    it("skips EXDATE occurrences", async () => {
      expect(await busyOn("daily-2005-exdate", "2026-10-28")).toEqual([
        "2026-10-28T08:00:00.000Z/2026-10-28T08:30:00.000Z",
      ]);
      expect(await busyOn("daily-2005-exdate", "2026-10-29")).toEqual([]);
    });

    it("keeps BYDAY filters", async () => {
      expect(await busyOn("weekdays-2005", "2026-10-30")).toEqual([
        "2026-10-30T08:00:00.000Z/2026-10-30T08:30:00.000Z",
      ]);
      expect(await busyOn("weekdays-2005", "2026-10-31")).toEqual([]);
    });

    it("keeps the INTERVAL phase of a daily series", async () => {
      // 2026-10-29 is 666 days after 2025-01-01 (even), 2026-10-28 is 665 (odd)
      expect(await busyOn("every-2-days", "2026-10-29")).toEqual([
        "2026-10-29T11:00:00.000Z/2026-10-29T11:30:00.000Z",
      ]);
      expect(await busyOn("every-2-days", "2026-10-28")).toEqual([]);
    });

    it("keeps the INTERVAL phase of a weekly series", async () => {
      // 2026-11-02 is 434 days (31 x 14) after 2025-08-25, 2026-10-26 is 427 days
      expect(await busyOn("every-2-weeks", "2026-11-02")).toEqual([
        "2026-11-02T13:30:00.000Z/2026-11-02T15:00:00.000Z",
      ]);
      expect(await busyOn("every-2-weeks", "2026-10-26")).toEqual([]);
    });
  });

  it.each(["hourly", "minutely"])("returns no busy time for a %s series", async (title) => {
    expect(await busyOn(title, "2026-10-29")).toEqual([]);
  });

  it("returns a non-recurring event", async () => {
    expect(await busyOn("single", "2026-10-29")).toEqual([
      "2026-10-29T09:00:00.000Z/2026-10-29T10:00:00.000Z",
    ]);
  });
});

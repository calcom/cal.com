import ICAL from "ical.js";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock crypto to bypass credential decryption in constructor
vi.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: vi.fn().mockReturnValue(JSON.stringify({ urls: ["https://example.com/calendar.ics"] })),
}));

// Mock prisma for getUserTimezoneFromDB
vi.mock("@calcom/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ timeZone: "UTC" }),
    },
  },
}));

import BuildCalendarService from "./CalendarService";

type ICSFeedCalendarServiceInstance = {
  fetchCalendars: ReturnType<typeof vi.fn>;
  getUserTimezoneFromDB: ReturnType<typeof vi.fn>;
  getAvailability: (params: { dateFrom: string; dateTo: string; selectedCalendars: { userId?: number }[] }) => Promise<{ start: string; end: string; title: string }[]>;
};

const makeCredential = () =>
  ({
    id: 1,
    type: "ics-feed_calendar",
    key: "encrypted-key",
    userId: 1,
    teamId: null,
    appId: "ics-feed",
    invalid: false,
  } as Parameters<typeof BuildCalendarService>[0]);

/**
 * Build a minimal ICAL.Component (vcalendar) with the given VEVENT strings.
 */
function buildVCalendar(vevents: string[]): ICAL.Component {
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Test//Test//EN",
    ...vevents,
    "END:VCALENDAR",
  ].join("\r\n");
  return new ICAL.Component(ICAL.parse(icsContent));
}

function makeEvent({
  uid = "test-uid@example.com",
  summary = "Test Event",
  dtstart = "20260404T100000Z",
  dtend = "20260404T110000Z",
  status,
  transp,
  allDay = false,
}: {
  uid?: string;
  summary?: string;
  dtstart?: string;
  dtend?: string;
  status?: string;
  transp?: string;
  allDay?: boolean;
}) {
  const dtStartLine = allDay ? `DTSTART;VALUE=DATE:${dtstart}` : `DTSTART:${dtstart}`;
  const dtEndLine = allDay ? `DTEND;VALUE=DATE:${dtend}` : `DTEND:${dtend}`;
  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `SUMMARY:${summary}`,
    dtStartLine,
    dtEndLine,
  ];
  if (status) lines.push(`STATUS:${status}`);
  if (transp) lines.push(`TRANSP:${transp}`);
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

function getService(): ICSFeedCalendarServiceInstance {
  const service = BuildCalendarService(makeCredential()) as unknown as ICSFeedCalendarServiceInstance;
  // Override getUserTimezoneFromDB so tests don't hit prisma
  service.getUserTimezoneFromDB = vi.fn().mockResolvedValue("UTC");
  return service;
}

describe("ICSFeedCalendarService - getAvailability", () => {
  const dateFrom = "2026-04-04T00:00:00.000Z";
  const dateTo = "2026-04-04T23:59:59.000Z";
  const selectedCalendars = [{ userId: 1, externalId: "https://example.com/calendar.ics", integration: "ics-feed_calendar" }];

  describe("STATUS:CANCELLED filtering", () => {
    it("excludes events with STATUS:CANCELLED from busy times", async () => {
      const service = getService();
      service.fetchCalendars = vi.fn().mockResolvedValue([
        {
          url: "https://example.com/calendar.ics",
          vcalendar: buildVCalendar([
            makeEvent({ uid: "cancelled@test", summary: "Cancelled Meeting", status: "CANCELLED" }),
          ]),
        },
      ]);

      const result = await service.getAvailability({ dateFrom, dateTo, selectedCalendars });
      expect(result).toHaveLength(0);
    });

    it("excludes events with lowercase STATUS:cancelled", async () => {
      const service = getService();
      service.fetchCalendars = vi.fn().mockResolvedValue([
        {
          url: "https://example.com/calendar.ics",
          vcalendar: buildVCalendar([
            makeEvent({ uid: "cancelled-lower@test", summary: "Cancelled Meeting", status: "cancelled" }),
          ]),
        },
      ]);

      const result = await service.getAvailability({ dateFrom, dateTo, selectedCalendars });
      expect(result).toHaveLength(0);
    });

    it("includes events with no STATUS set", async () => {
      const service = getService();
      service.fetchCalendars = vi.fn().mockResolvedValue([
        {
          url: "https://example.com/calendar.ics",
          vcalendar: buildVCalendar([
            makeEvent({ uid: "no-status@test", summary: "Normal Meeting" }),
          ]),
        },
      ]);

      const result = await service.getAvailability({ dateFrom, dateTo, selectedCalendars });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Normal Meeting");
    });

    it("includes events with STATUS:CONFIRMED", async () => {
      const service = getService();
      service.fetchCalendars = vi.fn().mockResolvedValue([
        {
          url: "https://example.com/calendar.ics",
          vcalendar: buildVCalendar([
            makeEvent({ uid: "confirmed@test", summary: "Confirmed Meeting", status: "CONFIRMED" }),
          ]),
        },
      ]);

      const result = await service.getAvailability({ dateFrom, dateTo, selectedCalendars });
      expect(result).toHaveLength(1);
    });

    it("includes active events while excluding cancelled ones in the same calendar", async () => {
      const service = getService();
      service.fetchCalendars = vi.fn().mockResolvedValue([
        {
          url: "https://example.com/calendar.ics",
          vcalendar: buildVCalendar([
            makeEvent({ uid: "active@test", summary: "Active Meeting" }),
            makeEvent({ uid: "cancelled@test", summary: "Cancelled Meeting", status: "CANCELLED",
              dtstart: "20260404T140000Z", dtend: "20260404T150000Z" }),
          ]),
        },
      ]);

      const result = await service.getAvailability({ dateFrom, dateTo, selectedCalendars });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Active Meeting");
    });
  });

  describe("Date range filtering for non-recurring events", () => {
    it("excludes events that start and end before dateFrom", async () => {
      const service = getService();
      service.fetchCalendars = vi.fn().mockResolvedValue([
        {
          url: "https://example.com/calendar.ics",
          vcalendar: buildVCalendar([
            makeEvent({
              uid: "past@test",
              summary: "Past Event",
              dtstart: "20260401T100000Z",
              dtend: "20260401T110000Z",
            }),
          ]),
        },
      ]);

      const result = await service.getAvailability({ dateFrom, dateTo, selectedCalendars });
      expect(result).toHaveLength(0);
    });

    it("excludes events that start after dateTo", async () => {
      const service = getService();
      service.fetchCalendars = vi.fn().mockResolvedValue([
        {
          url: "https://example.com/calendar.ics",
          vcalendar: buildVCalendar([
            makeEvent({
              uid: "future@test",
              summary: "Future Event",
              dtstart: "20260410T100000Z",
              dtend: "20260410T110000Z",
            }),
          ]),
        },
      ]);

      const result = await service.getAvailability({ dateFrom, dateTo, selectedCalendars });
      expect(result).toHaveLength(0);
    });

    it("includes events that fall within the date range", async () => {
      const service = getService();
      service.fetchCalendars = vi.fn().mockResolvedValue([
        {
          url: "https://example.com/calendar.ics",
          vcalendar: buildVCalendar([
            makeEvent({
              uid: "in-range@test",
              summary: "In Range Event",
              dtstart: "20260404T100000Z",
              dtend: "20260404T110000Z",
            }),
          ]),
        },
      ]);

      const result = await service.getAvailability({ dateFrom, dateTo, selectedCalendars });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("In Range Event");
    });

    it("includes events that start before dateFrom but end within the range", async () => {
      const service = getService();
      service.fetchCalendars = vi.fn().mockResolvedValue([
        {
          url: "https://example.com/calendar.ics",
          vcalendar: buildVCalendar([
            makeEvent({
              uid: "overlap-start@test",
              summary: "Overlapping Start Event",
              dtstart: "20260403T220000Z",
              dtend: "20260404T020000Z",
            }),
          ]),
        },
      ]);

      const result = await service.getAvailability({ dateFrom, dateTo, selectedCalendars });
      expect(result).toHaveLength(1);
    });

    it("includes events that start within range but end after dateTo", async () => {
      const service = getService();
      service.fetchCalendars = vi.fn().mockResolvedValue([
        {
          url: "https://example.com/calendar.ics",
          vcalendar: buildVCalendar([
            makeEvent({
              uid: "overlap-end@test",
              summary: "Overlapping End Event",
              dtstart: "20260404T220000Z",
              dtend: "20260405T020000Z",
            }),
          ]),
        },
      ]);

      const result = await service.getAvailability({ dateFrom, dateTo, selectedCalendars });
      expect(result).toHaveLength(1);
    });

    it("returns only in-range events when mix of past, current, and future events exist", async () => {
      const service = getService();
      service.fetchCalendars = vi.fn().mockResolvedValue([
        {
          url: "https://example.com/calendar.ics",
          vcalendar: buildVCalendar([
            makeEvent({ uid: "past@test", summary: "Past", dtstart: "20260401T100000Z", dtend: "20260401T110000Z" }),
            makeEvent({ uid: "current@test", summary: "Current", dtstart: "20260404T100000Z", dtend: "20260404T110000Z" }),
            makeEvent({ uid: "future@test", summary: "Future", dtstart: "20260410T100000Z", dtend: "20260410T110000Z" }),
          ]),
        },
      ]);

      const result = await service.getAvailability({ dateFrom, dateTo, selectedCalendars });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Current");
    });
  });

  describe("combined STATUS and date range filtering", () => {
    it("excludes cancelled in-range events and includes active in-range events", async () => {
      const service = getService();
      service.fetchCalendars = vi.fn().mockResolvedValue([
        {
          url: "https://example.com/calendar.ics",
          vcalendar: buildVCalendar([
            makeEvent({ uid: "active-in-range@test", summary: "Active In Range" }),
            makeEvent({ uid: "cancelled-in-range@test", summary: "Cancelled In Range",
              status: "CANCELLED", dtstart: "20260404T140000Z", dtend: "20260404T150000Z" }),
            makeEvent({ uid: "active-out-of-range@test", summary: "Active Out of Range",
              dtstart: "20260410T100000Z", dtend: "20260410T110000Z" }),
          ]),
        },
      ]);

      const result = await service.getAvailability({ dateFrom, dateTo, selectedCalendars });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Active In Range");
    });
  });

  describe("all-day events (VALUE=DATE)", () => {
    it("includes an all-day event falling on the queried date", async () => {
      const service = getService();
      service.fetchCalendars = vi.fn().mockResolvedValue([
        {
          url: "https://example.com/calendar.ics",
          vcalendar: buildVCalendar([
            makeEvent({
              uid: "allday-in-range@test",
              summary: "All Day Event",
              dtstart: "20260404",
              dtend: "20260405",
              allDay: true,
            }),
          ]),
        },
      ]);

      const result = await service.getAvailability({ dateFrom, dateTo, selectedCalendars });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("All Day Event");
    });

    it("excludes an all-day event on a different date", async () => {
      const service = getService();
      service.fetchCalendars = vi.fn().mockResolvedValue([
        {
          url: "https://example.com/calendar.ics",
          vcalendar: buildVCalendar([
            makeEvent({
              uid: "allday-out-of-range@test",
              summary: "All Day Event Yesterday",
              dtstart: "20260403",
              dtend: "20260404",
              allDay: true,
            }),
          ]),
        },
      ]);

      const result = await service.getAvailability({ dateFrom, dateTo, selectedCalendars });
      // DTEND is exclusive in iCal for all-day events; April 3 event ends at April 4 00:00 UTC
      // which is exactly dateFrom — it should be excluded as the event ends exactly at range start
      expect(result).toHaveLength(0);
    });
  });

  describe("events spanning the entire queried range", () => {
    it("includes a multi-day event that starts before dateFrom and ends after dateTo", async () => {
      const service = getService();
      service.fetchCalendars = vi.fn().mockResolvedValue([
        {
          url: "https://example.com/calendar.ics",
          vcalendar: buildVCalendar([
            makeEvent({
              uid: "spanning@test",
              summary: "Multi-day Conference",
              dtstart: "20260401T000000Z",
              dtend: "20260410T000000Z",
            }),
          ]),
        },
      ]);

      const result = await service.getAvailability({ dateFrom, dateTo, selectedCalendars });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Multi-day Conference");
    });
  });

  describe("STATUS:TENTATIVE behavior", () => {
    it("treats STATUS:TENTATIVE events as busy (they should block availability)", async () => {
      const service = getService();
      service.fetchCalendars = vi.fn().mockResolvedValue([
        {
          url: "https://example.com/calendar.ics",
          vcalendar: buildVCalendar([
            makeEvent({ uid: "tentative@test", summary: "Tentative Meeting", status: "TENTATIVE" }),
          ]),
        },
      ]);

      const result = await service.getAvailability({ dateFrom, dateTo, selectedCalendars });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Tentative Meeting");
    });
  });
});

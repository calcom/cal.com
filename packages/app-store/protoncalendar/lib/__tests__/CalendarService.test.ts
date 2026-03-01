import { describe, it, expect } from "vitest";
import ICAL from "ical.js";

// Test the Proton-specific helper functions by recreating them here
// (they're private in the module, so we test the logic directly)

function isCancelledEvent(vevent: ICAL.Component): boolean {
  const status = vevent.getFirstPropertyValue("status");
  return typeof status === "string" && status.toUpperCase() === "CANCELLED";
}

function getExdates(vevent: ICAL.Component): Set<string> {
  const exdates = new Set<string>();
  const props = vevent.getAllProperties("exdate");
  for (const prop of props) {
    const values = prop.getValues();
    for (const val of values) {
      if (val && typeof val.toJSDate === "function") {
        exdates.add(val.toJSDate().toISOString());
      }
    }
  }
  return exdates;
}

describe("ProtonCalendarService helpers", () => {
  describe("isCancelledEvent", () => {
    it("should return true for STATUS:CANCELLED events", () => {
      const vevent = new ICAL.Component("vevent");
      vevent.addPropertyWithValue("status", "CANCELLED");
      expect(isCancelledEvent(vevent)).toBe(true);
    });

    it("should return true for lowercase cancelled status", () => {
      const vevent = new ICAL.Component("vevent");
      vevent.addPropertyWithValue("status", "cancelled");
      expect(isCancelledEvent(vevent)).toBe(true);
    });

    it("should return false for CONFIRMED events", () => {
      const vevent = new ICAL.Component("vevent");
      vevent.addPropertyWithValue("status", "CONFIRMED");
      expect(isCancelledEvent(vevent)).toBe(false);
    });

    it("should return false for events without status", () => {
      const vevent = new ICAL.Component("vevent");
      expect(isCancelledEvent(vevent)).toBe(false);
    });
  });

  describe("getExdates", () => {
    it("should collect EXDATE values from a vevent", () => {
      const icsData = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20240101T100000Z
DTEND:20240101T110000Z
RRULE:FREQ=DAILY;COUNT=5
EXDATE:20240102T100000Z
EXDATE:20240104T100000Z
SUMMARY:Test recurring
END:VEVENT
END:VCALENDAR`;
      const jcal = ICAL.parse(icsData);
      const vcalendar = new ICAL.Component(jcal);
      const vevent = vcalendar.getFirstSubcomponent("vevent")!;
      const exdates = getExdates(vevent);
      expect(exdates.size).toBe(2);
      expect(exdates.has(new Date("2024-01-02T10:00:00Z").toISOString())).toBe(true);
      expect(exdates.has(new Date("2024-01-04T10:00:00Z").toISOString())).toBe(true);
    });

    it("should return empty set when no EXDATE present", () => {
      const vevent = new ICAL.Component("vevent");
      const exdates = getExdates(vevent);
      expect(exdates.size).toBe(0);
    });
  });

  describe("URL validation", () => {
    const ALLOWED_HOSTNAMES = ["calendar.proton.me", "calendar.protonmail.com"];

    function isAllowedUrl(url: string): boolean {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") return false;
        return ALLOWED_HOSTNAMES.some(
          (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
        );
      } catch {
        return false;
      }
    }

    it("should accept calendar.proton.me URLs", () => {
      expect(isAllowedUrl("https://calendar.proton.me/api/calendars/abc123/export")).toBe(true);
    });

    it("should accept calendar.protonmail.com URLs", () => {
      expect(isAllowedUrl("https://calendar.protonmail.com/api/calendars/abc123/export")).toBe(true);
    });

    it("should reject non-Proton URLs", () => {
      expect(isAllowedUrl("https://evil.com/calendar.ics")).toBe(false);
    });

    it("should reject HTTP URLs", () => {
      expect(isAllowedUrl("http://calendar.proton.me/api/calendars/abc123/export")).toBe(false);
    });

    it("should reject invalid URLs", () => {
      expect(isAllowedUrl("not-a-url")).toBe(false);
    });
  });

  describe("Proton ICS parsing", () => {
    it("should filter cancelled events from ICS data", () => {
      const icsData = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20240101T100000Z
DTEND:20240101T110000Z
SUMMARY:Active meeting
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
DTSTART:20240102T100000Z
DTEND:20240102T110000Z
SUMMARY:Cancelled meeting
STATUS:CANCELLED
END:VEVENT
BEGIN:VEVENT
DTSTART:20240103T100000Z
DTEND:20240103T110000Z
SUMMARY:No status meeting
END:VEVENT
END:VCALENDAR`;

      const jcal = ICAL.parse(icsData);
      const vcalendar = new ICAL.Component(jcal);
      const vevents = vcalendar.getAllSubcomponents("vevent");

      const activeEvents = vevents.filter((vevent) => !isCancelledEvent(vevent));
      expect(activeEvents.length).toBe(2);
      expect(String(activeEvents[0].getFirstPropertyValue("summary"))).toBe("Active meeting");
      expect(String(activeEvents[1].getFirstPropertyValue("summary"))).toBe("No status meeting");
    });
  });
});

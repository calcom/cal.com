import { describe, it, expect, beforeEach, vi } from "vitest";
import ICAL from "ical.js";
import { BuildCalendarService } from "./CalendarService";

// Mock ICS data
const mockIcsConfirmedEvent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Proton//Proton Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Test Calendar
BEGIN:VEVENT
UID:confirmed-event-123@example.com
DTSTART:20260101T100000Z
DTEND:20260101T110000Z
SUMMARY:Confirmed Meeting
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

const mockIcsCancelledEvent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Proton//Proton Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Test Calendar
BEGIN:VEVENT
UID:cancelled-event-456@example.com
DTSTART:20260102T100000Z
DTEND:20260102T110000Z
SUMMARY:Cancelled Meeting
STATUS:CANCELLED
END:VEVENT
END:VCALENDAR`;

const mockIcsRecurringEvent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Proton//Proton Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Test Calendar
BEGIN:VEVENT
UID:recurring-event-789@example.com
DTSTART:20260101T140000Z
DTEND:20260101T150000Z
SUMMARY:Weekly Meeting
RRULE:FREQ=WEEKLY;COUNT=5
EXDATE:20260115T140000Z
END:VEVENT
END:VCALENDAR`;

// Mock fetch for testing
global.fetch = vi.fn();

describe("ProtonCalendarService", () => {
  let service: ReturnType<typeof BuildCalendarService>;
  const mockCredential = {
    id: 1,
    type: "proton_calendar" as const,
    key: btoa(JSON.stringify({ urls: ["https://calendar.proton.me/test.ics"] })),
    userId: 1,
    user: { email: "test@proton.me" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = BuildCalendarService(mockCredential as any);
  });

  describe("fetchCalendars", () => {
    it("should fetch ICS feed with SSRF protection (redirect: manual)", async () => {
      (fetch as any).mockResolvedValueOnce({
        text: () => Promise.resolve(mockIcsConfirmedEvent),
      });

      await service.fetchCalendars();

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          redirect: "manual",
          signal: expect.any(AbortSignal),
        })
      );
    });

    it("should timeout after 10 seconds (SSRF protection)", async () => {
      const abortSpy = vi.spyOn(AbortController.prototype, "abort");
      (fetch as any).mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      // Fast-forward time
      vi.useFakeTimers();
      const fetchPromise = service.fetchCalendars();
      vi.advanceTimersByTime(10000);
      
      expect(abortSpy).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe("getAvailability", () => {
    it("should filter out STATUS:CANCELLED events", async () => {
      (fetch as any).mockResolvedValueOnce({
        text: () => Promise.resolve(mockIcsCancelledEvent),
      });

      const events = await service.getAvailability({
        dateFrom: "2026-01-01T00:00:00Z",
        dateTo: "2026-01-31T23:59:59Z",
        selectedCalendars: [{ userId: 1 } as any],
      });

      expect(events).toHaveLength(0); // Cancelled event should be filtered
    });

    it("should return confirmed events", async () => {
      (fetch as any).mockResolvedValueOnce({
        text: () => Promise.resolve(mockIcsConfirmedEvent),
      });

      const events = await service.getAvailability({
        dateFrom: "2026-01-01T00:00:00Z",
        dateTo: "2026-01-31T23:59:59Z",
        selectedCalendars: [{ userId: 1 } as any],
      });

      expect(events).toHaveLength(1);
      expect(events[0].title).toBe("Confirmed Meeting");
    });

    it("should handle EXDATE for recurring events (skip cancelled occurrences)", async () => {
      (fetch as any).mockResolvedValueOnce({
        text: () => Promise.resolve(mockIcsRecurringEvent),
      });

      const events = await service.getAvailability({
        dateFrom: "2026-01-01T00:00:00Z",
        dateTo: "2026-02-28T23:59:59Z",
        selectedCalendars: [{ userId: 1 } as any],
      });

      // Should have 4 events (5 total - 1 EXDATE)
      expect(events.length).toBe(4);
      // The EXDATE date should not be in the results
      const exdateStr = "2026-01-15T14:00:00.000Z";
      const hasExdate = events.some(e => e.start === exdateStr);
      expect(hasExdate).toBe(false);
    });
  });

  describe("read-only methods", () => {
    it("createEvent should be a no-op with warning", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = await service.createEvent({} as any, 0);
      
      expect(consoleSpy).toHaveBeenCalledWith("createEvent called on Proton Calendar (read-only)");
      expect(result.additionalInfo).toEqual({ calWarnings: ["Proton Calendar is read-only"] });
      consoleSpy.mockRestore();
    });

    it("deleteEvent should be a no-op with warning", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      await service.deleteEvent("test-uid", {} as any);
      
      expect(consoleSpy).toHaveBeenCalledWith("deleteEvent called on Proton Calendar (read-only)");
      consoleSpy.mockRestore();
    });

    it("updateEvent should be a no-op with warning", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      await service.updateEvent("test-uid", {} as any);
      
      expect(consoleSpy).toHaveBeenCalledWith("updateEvent called on Proton Calendar (read-only)");
      consoleSpy.mockRestore();
    });
  });

  describe("isEventCancelled", () => {
    it("should return true for STATUS:CANCELLED events", () => {
      const jcalData = ICAL.parse(mockIcsCancelledEvent);
      const vcalendar = new ICAL.Component(jcalData);
      const vevent = vcalendar.getFirstSubcomponent("vevent");
      
      // Access the private method via type assertion
      const result = (service as any).isEventCancelled(vevent);
      expect(result).toBe(true);
    });

    it("should return false for CONFIRMED events", () => {
      const jcalData = ICAL.parse(mockIcsConfirmedEvent);
      const vcalendar = new ICAL.Component(jcalData);
      const vevent = vcalendar.getFirstSubcomponent("vevent");
      
      const result = (service as any).isEventCancelled(vevent);
      expect(result).toBe(false);
    });
  });
});

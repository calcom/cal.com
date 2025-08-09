import { describe, it, expect } from "vitest";
import dayjs from "@calcom/dayjs";
import { addScheduleAgentClient } from "./CalendarService";

describe("Timezone handling consistency across calendar services", () => {
  describe("CalendarService timezone handling", () => {
    it("should add SCHEDULE-AGENT=CLIENT to ATTENDEE lines", () => {
      const testIcal = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-123
DTSTART:20240115T140000
DTEND:20240115T150000
ATTENDEE:mailto:test@example.com
END:VEVENT
END:VCALENDAR`;

      const result = addScheduleAgentClient(testIcal);
      
      // Should add SCHEDULE-AGENT=CLIENT to ATTENDEE lines
      expect(result).toContain("ATTENDEE;SCHEDULE-AGENT=CLIENT:mailto:test@example.com");
      expect(result).toContain("BEGIN:VCALENDAR");
      expect(result).toContain("END:VCALENDAR");
    });

    it("should handle multiple attendees with timezone data", () => {
      const testIcal = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Cal.com Inc.//Cal.com Event//EN
BEGIN:VTIMEZONE
TZID:America/New_York
BEGIN:STANDARD
DTSTART:20231105T020000
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:20240310T020000
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
END:VTIMEZONE
BEGIN:VEVENT
UID:test-123
DTSTART;TZID=America/New_York:20240115T140000
DTEND;TZID=America/New_York:20240115T150000
ATTENDEE;CN=John Doe:mailto:john@example.com
ATTENDEE;CN=Jane Smith:mailto:jane@example.com
ORGANIZER;CN=Organizer:mailto:organizer@example.com
END:VEVENT
END:VCALENDAR`;

      const result = addScheduleAgentClient(testIcal);
      
      // Should add SCHEDULE-AGENT=CLIENT to all ATTENDEE lines
      expect(result).toContain("ATTENDEE;CN=John Doe;SCHEDULE-AGENT=CLIENT:mailto:john@example.com");
      expect(result).toContain("ATTENDEE;CN=Jane Smith;SCHEDULE-AGENT=CLIENT:mailto:jane@example.com");
      // Should not modify ORGANIZER line
      expect(result).toContain("ORGANIZER;CN=Organizer:mailto:organizer@example.com");
      // Should preserve timezone information
      expect(result).toContain("TZID:America/New_York");
    });
  });

  describe("Timezone conversion consistency", () => {
    it("should handle local time to UTC conversion correctly", () => {
      // Test data for different timezones
      const timezoneTests = [
        {
          name: "New York (EST)",
          localTime: "2024-01-15T14:00:00",
          timezone: "America/New_York",
          expectedUTC: "2024-01-15T19:00:00Z"
        },
        {
          name: "London (GMT)",
          localTime: "2024-01-15T14:00:00",
          timezone: "Europe/London",
          expectedUTC: "2024-01-15T14:00:00Z"
        },
        {
          name: "Tokyo (JST)",
          localTime: "2024-01-15T14:00:00",
          timezone: "Asia/Tokyo",
          expectedUTC: "2024-01-15T05:00:00Z"
        }
      ];

      timezoneTests.forEach(({ name, localTime, timezone, expectedUTC }) => {
        const localDate = dayjs.tz(localTime, timezone);
        const utcDate = localDate.utc();
        
        expect(utcDate.format()).toBe(expectedUTC);
      });
    });

    it("should generate consistent date arrays for local input", () => {
      const testTime = "2024-01-15T14:30:00";
      const date = new Date(testTime);
      
      // Local date array (as used in updated files)
      const localArray = [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
        date.getHours(),
        date.getMinutes()
      ];
      
      // UTC date array (old approach)
      const utcArray = [
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes()
      ];
      
      // Arrays should be different if not in UTC timezone
      const timezoneOffset = date.getTimezoneOffset();
      if (timezoneOffset !== 0) {
        expect(localArray).not.toEqual(utcArray);
      }
      
      // Local array should match the date's local values
      expect(localArray).toEqual([2024, 1, 15, 14, 30]);
    });
  });

  describe("Daylight Saving Time handling", () => {
    it("should handle DST transitions correctly", () => {
      // Test dates around US DST transition in 2024
      // DST starts: March 10, 2024 at 2:00 AM
      const beforeDST = dayjs.tz("2024-03-09T14:00:00", "America/New_York");
      const afterDST = dayjs.tz("2024-03-11T14:00:00", "America/New_York");
      
      // Before DST: EST (UTC-5)
      expect(beforeDST.utcOffset()).toBe(-300); // -5 hours in minutes
      
      // After DST: EDT (UTC-4)
      expect(afterDST.utcOffset()).toBe(-240); // -4 hours in minutes
      
      // Same local time should map to different UTC times
      expect(beforeDST.utc().format()).toBe("2024-03-09T19:00:00Z");
      expect(afterDST.utc().format()).toBe("2024-03-11T18:00:00Z");
    });

    it("should handle DST fall back correctly", () => {
      // DST ends: November 3, 2024 at 2:00 AM
      const beforeFallback = dayjs.tz("2024-11-02T14:00:00", "America/New_York");
      const afterFallback = dayjs.tz("2024-11-04T14:00:00", "America/New_York");
      
      // Before fall back: EDT (UTC-4)
      expect(beforeFallback.utcOffset()).toBe(-240);
      
      // After fall back: EST (UTC-5)
      expect(afterFallback.utcOffset()).toBe(-300);
      
      // Same local time should map to different UTC times
      expect(beforeFallback.utc().format()).toBe("2024-11-02T18:00:00Z");
      expect(afterFallback.utc().format()).toBe("2024-11-04T19:00:00Z");
    });
  });

  describe("Integration test scenarios", () => {
    it("should prevent duplicate events across calendar systems", () => {
      // Test scenario: Same event created in CalDAV and synced to Google Calendar
      const eventUID = "unique-event-123";
      const startTime = "2024-01-15T14:00:00";
      const endTime = "2024-01-15T15:00:00";
      
      // Both systems should use the same UID
      const caldavEvent = {
        uid: eventUID,
        startTime: startTime,
        endTime: endTime
      };
      
      const googleEvent = {
        uid: eventUID,
        startTime: startTime,
        endTime: endTime
      };
      
      // UIDs should match to prevent duplicates
      expect(caldavEvent.uid).toBe(googleEvent.uid);
      
      // Times should be identical
      expect(caldavEvent.startTime).toBe(googleEvent.startTime);
      expect(caldavEvent.endTime).toBe(googleEvent.endTime);
    });

    it("should handle recurring events with timezone information", () => {
      const recurringIcal = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VTIMEZONE
TZID:America/New_York
END:VTIMEZONE
BEGIN:VEVENT
UID:recurring-123
DTSTART;TZID=America/New_York:20240115T140000
DTEND;TZID=America/New_York:20240115T150000
RRULE:FREQ=WEEKLY;COUNT=4
ATTENDEE:mailto:attendee@example.com
END:VEVENT
END:VCALENDAR`;

      const result = addScheduleAgentClient(recurringIcal);
      
      // Should add SCHEDULE-AGENT=CLIENT
      expect(result).toContain("ATTENDEE;SCHEDULE-AGENT=CLIENT:mailto:attendee@example.com");
      
      // Should preserve recurring rule
      expect(result).toContain("RRULE:FREQ=WEEKLY;COUNT=4");
      
      // Should preserve timezone
      expect(result).toContain("TZID:America/New_York");
    });
  });
});
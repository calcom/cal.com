import { describe, it, expect } from "vitest";

import { addScheduleAgentClient } from "./CalendarService";

describe("addScheduleAgentClient", () => {
  it("should add SCHEDULE-AGENT=CLIENT to simple ATTENDEE lines", () => {
    const input = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "UID:123456",
      "DTSTART:20240101T120000Z",
      "DTEND:20240101T130000Z",
      "SUMMARY:Test Event",
      "ATTENDEE:mailto:user1@example.com",
      "ATTENDEE:mailto:user2@example.com",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const expected = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "UID:123456",
      "DTSTART:20240101T120000Z",
      "DTEND:20240101T130000Z",
      "SUMMARY:Test Event",
      "ATTENDEE;SCHEDULE-AGENT=CLIENT:mailto:user1@example.com",
      "ATTENDEE;SCHEDULE-AGENT=CLIENT:mailto:user2@example.com",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const result = addScheduleAgentClient(input);
    expect(result).toBe(expected);
  });

  it("should add SCHEDULE-AGENT=CLIENT to ATTENDEE lines with existing parameters", () => {
    const input = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      'ATTENDEE;PARTSTAT=NEEDS-ACTION;CN="John Doe":mailto:john@example.com',
      "ATTENDEE;PARTSTAT=ACCEPTED:mailto:jane@example.com",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const result = addScheduleAgentClient(input);

    // Verify SCHEDULE-AGENT=CLIENT was added to both attendees
    // Note: Lines may be folded if they exceed 75 characters
    // Check for SCHEDULE-AGENT=CLIENT being added
    expect(result).toContain("SCHEDULE-AGENT=CLIENT");
    // Remove line breaks to check content
    const unfoldedResult = result.replace(/\r?\n\s/g, "");
    expect(unfoldedResult).toContain("mailto:john@example.com");
    expect(unfoldedResult).toContain("mailto:jane@example.com");
  });

  it("should not modify ATTENDEE lines that already have SCHEDULE-AGENT", () => {
    const input = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "ATTENDEE;SCHEDULE-AGENT=SERVER:mailto:user@example.com",
      "ATTENDEE;PARTSTAT=ACCEPTED;SCHEDULE-AGENT=CLIENT:mailto:user2@example.com",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const expected = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "ATTENDEE;SCHEDULE-AGENT=SERVER:mailto:user@example.com",
      "ATTENDEE;PARTSTAT=ACCEPTED;SCHEDULE-AGENT=CLIENT:mailto:user2@example.com",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const result = addScheduleAgentClient(input);
    expect(result).toBe(expected);
  });

  it("should handle empty strings", () => {
    const input = "";
    const result = addScheduleAgentClient(input);
    expect(result).toBe("");
  });

  it("should handle iCal strings without ATTENDEE lines", () => {
    const input = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "UID:123456",
      "DTSTART:20240101T120000Z",
      "DTEND:20240101T130000Z",
      "SUMMARY:Test Event Without Attendees",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const expected = input.split("\n").join("\r\n");

    const result = addScheduleAgentClient(input);
    expect(result).toBe(expected);
  });

  it("should handle malformed ATTENDEE lines without colon", () => {
    const input = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "ATTENDEE_MALFORMED_NO_COLON",
      "ATTENDEE:mailto:valid@example.com",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const expected = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "ATTENDEE_MALFORMED_NO_COLON",
      "ATTENDEE;SCHEDULE-AGENT=CLIENT:mailto:valid@example.com",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const result = addScheduleAgentClient(input);
    expect(result).toBe(expected);
  });

  it("should preserve line endings (CRLF)", () => {
    const input = "BEGIN:VCALENDAR\r\nATTENDEE:mailto:user@example.com\r\nEND:VCALENDAR";
    const expected =
      "BEGIN:VCALENDAR\r\nATTENDEE;SCHEDULE-AGENT=CLIENT:mailto:user@example.com\r\nEND:VCALENDAR";

    const result = addScheduleAgentClient(input);
    expect(result).toBe(expected);
  });

  it("should handle real-world iCalendar format", () => {
    const input = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Cal.com Inc.//Cal.com Event//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      "UID:12345-67890-abcdef",
      "DTSTART:20240115T140000Z",
      "DTEND:20240115T150000Z",
      "SUMMARY:Team Meeting",
      "DESCRIPTION:Weekly team sync",
      "LOCATION:https://meet.google.com/abc-defg-hij",
      "ORGANIZER;CN=John Organizer:mailto:organizer@example.com",
      "ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN=Alice:mailto:alice@example.com",
      "ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=OPT-PARTICIPANT;PARTSTAT=TENTATIVE;RSVP=TRUE;CN=Bob:mailto:bob@example.com",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const result = addScheduleAgentClient(input);

    // Check that SCHEDULE-AGENT=CLIENT was added to both attendees
    // Using regex to handle potential line folding ([\s\S] matches any character including newlines)
    expect(result).toMatch(
      /ATTENDEE[\s\S]*CUTYPE=INDIVIDUAL[\s\S]*ROLE=REQ-PARTICIPANT[\s\S]*PARTSTAT=NEEDS-ACTION[\s\S]*CN=Al[\s\S]*ice[\s\S]*SCHEDULE-AGENT=CLIENT[\s\S]*mailto:alice@example\.com/
    );
    expect(result).toMatch(
      /ATTENDEE[\s\S]*CUTYPE=INDIVIDUAL[\s\S]*ROLE=OPT-PARTICIPANT[\s\S]*PARTSTAT=TENTATIVE[\s\S]*RSVP=TRU[\s\S]*E[\s\S]*CN=Bob[\s\S]*SCHEDULE-AGENT=CLIENT[\s\S]*mailto:bob@example\.com/
    );
    // Organizer line should not be modified
    expect(result).toContain("ORGANIZER;CN=John Organizer:mailto:organizer@example.com");
  });

  it("should handle case-insensitive ATTENDEE lines", () => {
    const input = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "attendee:mailto:lowercase@example.com",
      "Attendee:mailto:capitalized@example.com",
      "ATTENDEE:mailto:uppercase@example.com",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const expected = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "attendee;SCHEDULE-AGENT=CLIENT:mailto:lowercase@example.com",
      "Attendee;SCHEDULE-AGENT=CLIENT:mailto:capitalized@example.com",
      "ATTENDEE;SCHEDULE-AGENT=CLIENT:mailto:uppercase@example.com",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const result = addScheduleAgentClient(input);
    expect(result).toBe(expected);
  });

  it("should handle folded lines (RFC 5545 line folding)", () => {
    const input = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN=",
      ' "Very Long Name That Causes Line Folding":mailto:verylongemailaddress@exam',
      " ple.com",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const result = addScheduleAgentClient(input);

    // The folded line should be unfolded, processed, and potentially re-folded
    // Verify that SCHEDULE-AGENT=CLIENT was added
    expect(result).toContain("SCHEDULE-AGENT=CLIENT");
    // Remove line breaks to check content
    const unfoldedResult = result.replace(/\r?\n\s/g, "");
    expect(unfoldedResult).toContain("mailto:verylongemailaddress@example.com");
  });

  it("should not add SCHEDULE-AGENT if already present (case-insensitive)", () => {
    const input = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "ATTENDEE;schedule-agent=CLIENT:mailto:lowercase@example.com",
      "ATTENDEE;Schedule-Agent=SERVER:mailto:mixedcase@example.com",
      "ATTENDEE;SCHEDULE-AGENT=CLIENT:mailto:uppercase@example.com",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const result = addScheduleAgentClient(input);

    // None of these should be modified since they already have SCHEDULE-AGENT
    expect(result).toContain("ATTENDEE;schedule-agent=CLIENT:mailto:lowercase@example.com");
    expect(result).toContain("ATTENDEE;Schedule-Agent=SERVER:mailto:mixedcase@example.com");
    expect(result).toContain("ATTENDEE;SCHEDULE-AGENT=CLIENT:mailto:uppercase@example.com");
  });

  it("should re-fold long lines that exceed 75 characters", () => {
    const input = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      'ATTENDEE;CN="User With Very Long Display Name That Will Cause Line To Exceed Limit":mailto:verylongemailaddressthatwillcauselinetoexceedlimit@example.com',
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const result = addScheduleAgentClient(input);

    // The long ATTENDEE line should be folded
    const lines = result.split("\r\n");

    // Find the ATTENDEE line
    const attendeeLineIndex = lines.findIndex((line) => line.match(/^ATTENDEE/i));
    expect(attendeeLineIndex).toBeGreaterThan(-1);

    // Check that the line is folded (next line should start with a space)
    expect(lines[attendeeLineIndex].length).toBeLessThanOrEqual(75);
    expect(lines[attendeeLineIndex + 1]).toMatch(/^ /);

    // Verify SCHEDULE-AGENT=CLIENT was added
    const fullAttendee = lines[attendeeLineIndex] + lines[attendeeLineIndex + 1].substring(1);
    expect(fullAttendee).toContain("SCHEDULE-AGENT=CLIENT");
  });

  it("should handle UTF-8 characters correctly when folding (count bytes not characters)", () => {
    const input = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      // String with emoji and special characters that take multiple bytes
      'ATTENDEE;CN="Test User 你好 🎉 with long name to exceed limit":mailto:test@example.com',
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const result = addScheduleAgentClient(input);
    const lines = result.split("\r\n");

    // Find all lines that are part of the ATTENDEE
    const attendeeLineIndex = lines.findIndex((line) => line.match(/^ATTENDEE/i));
    expect(attendeeLineIndex).toBeGreaterThan(-1);

    // Check that no line exceeds 75 bytes (octets)
    for (let i = attendeeLineIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line.match(/^ATTENDEE/i) && !line.match(/^ /)) break;

      const lineBytes = Buffer.from(line, "utf8").length;
      expect(lineBytes).toBeLessThanOrEqual(75);
    }

    // Verify SCHEDULE-AGENT=CLIENT was added
    const unfoldedResult = result.replace(/\r?\n\s/g, "");
    expect(unfoldedResult).toContain("SCHEDULE-AGENT=CLIENT");
  });

  it("should handle complex iCalendar with multiple attendees and timezone info", () => {
    const input = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Cal.com Inc.//Cal.com Event//EN",
      "BEGIN:VEVENT",
      "UID:test-event-123",
      "DTSTART;TZID=America/New_York:20240115T140000",
      "DTEND;TZID=America/New_York:20240115T150000", 
      "SUMMARY:Team Meeting with Timezone",
      "ORGANIZER;CN=John Organizer:mailto:organizer@example.com",
      "ATTENDEE;CN=Alice Smith;PARTSTAT=NEEDS-ACTION:mailto:alice@example.com",
      "ATTENDEE;CN=Bob Johnson;PARTSTAT=TENTATIVE:mailto:bob@example.com",
      "ATTENDEE;CN=Charlie Brown;PARTSTAT=ACCEPTED:mailto:charlie@example.com",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const result = addScheduleAgentClient(input);

    // Verify all attendees get SCHEDULE-AGENT=CLIENT
    const attendeeCount = (result.match(/ATTENDEE/gi) || []).length;
    const scheduleAgentCount = (result.match(/SCHEDULE-AGENT=CLIENT/gi) || []).length;
    expect(scheduleAgentCount).toBe(attendeeCount);

    // Verify timezone information is preserved
    expect(result).toContain("TZID=America/New_York");
    
    // Verify all attendees have SCHEDULE-AGENT=CLIENT (emails may be folded)
    const unfoldedResult = result.replace(/\r?\n\s/g, "");
    expect(unfoldedResult).toContain("alice@example.com");
    expect(unfoldedResult).toContain("bob@example.com");
    expect(unfoldedResult).toContain("charlie@example.com");
  });
});

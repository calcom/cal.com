import { describe, expect, it } from "vitest";

import { addScheduleAgentClient, foldLine } from "./CalendarService";

describe("foldLine", () => {
  describe("basic functionality", () => {
    it("returns short lines unchanged", () => {
      const shortLine = "ATTENDEE:mailto:test@example.com";
      expect(foldLine(shortLine)).toBe(shortLine);
    });

    it("returns empty string unchanged", () => {
      expect(foldLine("")).toBe("");
    });

    it("returns line exactly at 75 octets unchanged", () => {
      // Create a line that is exactly 75 bytes
      const line = "A".repeat(75);
      expect(foldLine(line)).toBe(line);
      expect(new TextEncoder().encode(line).length).toBe(75);
    });

    it("folds line at 76 octets", () => {
      const line = "A".repeat(76);
      const result = foldLine(line);
      expect(result).toContain("\r\n ");
      // First line should be 75 chars, then CRLF + space + remaining
      expect(result).toBe("A".repeat(75) + "\r\n " + "A");
    });
  });

  describe("RFC 5545 compliance", () => {
    it("uses CRLF followed by single space for folding", () => {
      const longLine = "A".repeat(100);
      const result = foldLine(longLine);
      expect(result).toContain("\r\n ");
      // Should not contain just LF or just CR
      expect(result.split("\r\n ").length).toBeGreaterThan(1);
    });

    it("ensures no line segment exceeds 75 octets", () => {
      const longLine = "A".repeat(200);
      const result = foldLine(longLine);
      const segments = result.split("\r\n ");

      // First segment should be exactly 75 bytes
      expect(new TextEncoder().encode(segments[0]).length).toBe(75);

      // Continuation segments should be at most 74 bytes (75 - 1 for leading space)
      for (let i = 1; i < segments.length; i++) {
        expect(new TextEncoder().encode(segments[i]).length).toBeLessThanOrEqual(74);
      }
    });

    it("handles very long lines requiring multiple folds", () => {
      const longLine = "A".repeat(300);
      const result = foldLine(longLine);
      const segments = result.split("\r\n ");
      // 300 chars: first 75, then 74*3 = 222, remaining 3
      // So we need: 75 + 74 + 74 + 74 + 3 = 300, that's 5 segments
      expect(segments.length).toBe(5);
    });
  });

  describe("UTF-8 byte counting", () => {
    it("counts bytes not characters for ASCII", () => {
      const line = "A".repeat(75);
      expect(foldLine(line)).toBe(line);
    });

    it("counts bytes correctly for multi-byte UTF-8 characters", () => {
      // Chinese characters are typically 3 bytes each in UTF-8
      // 25 Chinese chars = 75 bytes, should not fold
      const chineseChars = "\u4e2d".repeat(25); // 25 * 3 = 75 bytes
      expect(new TextEncoder().encode(chineseChars).length).toBe(75);
      expect(foldLine(chineseChars)).toBe(chineseChars);
    });

    it("folds correctly when multi-byte char would exceed limit", () => {
      // 24 Chinese chars = 72 bytes, adding one more (3 bytes) = 75, still OK
      // 26 Chinese chars = 78 bytes, needs folding
      const chineseChars = "\u4e2d".repeat(26); // 26 * 3 = 78 bytes
      const result = foldLine(chineseChars);
      expect(result).toContain("\r\n ");
    });

    it("does not split multi-byte characters across fold boundaries", () => {
      // Create a line where folding in the middle of a multi-byte char would be wrong
      const line = "A".repeat(74) + "\u4e2d"; // 74 + 3 = 77 bytes
      const result = foldLine(line);
      // The Chinese character should be on the continuation line, not split
      expect(result).toBe("A".repeat(74) + "\r\n " + "\u4e2d");
    });

    it("handles emoji (4-byte UTF-8 characters)", () => {
      // Emoji are typically 4 bytes in UTF-8
      const emoji = "\u{1F600}"; // Grinning face
      expect(new TextEncoder().encode(emoji).length).toBe(4);

      // 18 emoji = 72 bytes, one more = 76 bytes, needs folding
      const line = emoji.repeat(19); // 19 * 4 = 76 bytes
      const result = foldLine(line);
      expect(result).toContain("\r\n ");
    });

    it("handles mixed ASCII and multi-byte characters", () => {
      // Mix of ASCII and Chinese: "Hello\u4e2d\u6587World"
      const line = "ATTENDEE;CN=\u5f20\u4e09:mailto:zhang@example.com";
      const result = foldLine(line);
      // This line is short enough, should not fold
      expect(result).toBe(line);
    });
  });

  describe("custom maxOctets parameter", () => {
    it("respects custom maxOctets value", () => {
      const line = "A".repeat(50);
      const result = foldLine(line, 30);
      expect(result).toContain("\r\n ");
    });

    it("handles maxOctets of 1", () => {
      const line = "ABC";
      const result = foldLine(line, 1);
      // Each char on its own line (but continuation lines have 0 bytes for content)
      // This is an edge case - first line "A", then continuation lines
      expect(result.split("\r\n ").length).toBe(3);
    });
  });
});

describe("addScheduleAgentClient", () => {
  describe("basic functionality", () => {
    it("adds SCHEDULE-AGENT=CLIENT to simple ATTENDEE line", () => {
      const input = "ATTENDEE:mailto:test@example.com\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
      expect(result).toContain("mailto:test@example.com");
    });

    it("adds SCHEDULE-AGENT=CLIENT before the mailto: value", () => {
      const input = "ATTENDEE:mailto:test@example.com\r\n";
      const result = addScheduleAgentClient(input);
      // SCHEDULE-AGENT should be in params, before :mailto:
      expect(result).toMatch(/ATTENDEE.*SCHEDULE-AGENT=CLIENT.*:mailto:/);
    });

    it("handles ATTENDEE with existing parameters", () => {
      const input = "ATTENDEE;CN=John Doe;PARTSTAT=NEEDS-ACTION:mailto:john@example.com\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
      expect(result).toContain("CN=John Doe");
      expect(result).toContain("PARTSTAT=NEEDS-ACTION");
    });

    it("processes multiple ATTENDEE lines", () => {
      const input =
        "ATTENDEE:mailto:user1@example.com\r\n" +
        "ATTENDEE:mailto:user2@example.com\r\n" +
        "ATTENDEE:mailto:user3@example.com\r\n";
      const result = addScheduleAgentClient(input);
      const matches = result.match(/SCHEDULE-AGENT=CLIENT/g);
      expect(matches).toHaveLength(3);
    });

    it("returns empty string unchanged", () => {
      expect(addScheduleAgentClient("")).toBe("");
    });

    it("returns iCal without ATTENDEE lines unchanged", () => {
      const input =
        "BEGIN:VCALENDAR\r\n" +
        "VERSION:2.0\r\n" +
        "BEGIN:VEVENT\r\n" +
        "SUMMARY:Test Event\r\n" +
        "END:VEVENT\r\n" +
        "END:VCALENDAR\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toBe(input);
    });
  });

  describe("idempotency - does not add duplicate SCHEDULE-AGENT", () => {
    it("does not add SCHEDULE-AGENT if already present", () => {
      const input = "ATTENDEE;SCHEDULE-AGENT=CLIENT:mailto:test@example.com\r\n";
      const result = addScheduleAgentClient(input);
      const matches = result.match(/SCHEDULE-AGENT/g);
      expect(matches).toHaveLength(1);
    });

    it("does not add SCHEDULE-AGENT if SCHEDULE-AGENT=SERVER is present", () => {
      const input = "ATTENDEE;SCHEDULE-AGENT=SERVER:mailto:test@example.com\r\n";
      const result = addScheduleAgentClient(input);
      // Should not add another SCHEDULE-AGENT
      const matches = result.match(/SCHEDULE-AGENT/g);
      expect(matches).toHaveLength(1);
      expect(result).toContain("SCHEDULE-AGENT=SERVER");
    });

    it("is idempotent - running twice produces same result", () => {
      const input = "ATTENDEE:mailto:test@example.com\r\n";
      const firstPass = addScheduleAgentClient(input);
      const secondPass = addScheduleAgentClient(firstPass);
      expect(secondPass).toBe(firstPass);
    });
  });

  describe("case-insensitive matching (RFC 5545)", () => {
    it("handles lowercase attendee", () => {
      const input = "attendee:mailto:test@example.com\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
    });

    it("handles mixed case Attendee", () => {
      const input = "Attendee:mailto:test@example.com\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
    });

    it("handles uppercase ATTENDEE", () => {
      const input = "ATTENDEE:mailto:test@example.com\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
    });

    it("handles case-insensitive existing SCHEDULE-AGENT", () => {
      const input = "ATTENDEE;schedule-agent=client:mailto:test@example.com\r\n";
      const result = addScheduleAgentClient(input);
      const matches = result.match(/schedule-agent/gi);
      expect(matches).toHaveLength(1);
    });
  });

  describe("folded line handling (RFC 5545)", () => {
    it("handles CRLF + space folded lines", () => {
      const input = "ATTENDEE;CN=Very Long Name That Causes Folding\r\n :mailto:test@example.com\r\n";
      const result = addScheduleAgentClient(input);
      // After unfolding and refolding, SCHEDULE-AGENT should be present
      // The result may be folded, so we unfold to check content
      const unfolded = result.replace(/\r?\n[ \t]/g, "");
      expect(unfolded).toContain("SCHEDULE-AGENT=CLIENT");
      expect(unfolded).toContain("mailto:test@example.com");
    });

    it("handles CRLF + tab folded lines", () => {
      const input = "ATTENDEE;CN=Very Long Name That Causes Folding\r\n\t:mailto:test@example.com\r\n";
      const result = addScheduleAgentClient(input);
      const unfolded = result.replace(/\r?\n[ \t]/g, "");
      expect(unfolded).toContain("SCHEDULE-AGENT=CLIENT");
    });

    it("handles LF + space folded lines (non-standard but common)", () => {
      const input = "ATTENDEE;CN=Very Long Name That Causes Folding\n :mailto:test@example.com\r\n";
      const result = addScheduleAgentClient(input);
      const unfolded = result.replace(/\r?\n[ \t]/g, "");
      expect(unfolded).toContain("SCHEDULE-AGENT=CLIENT");
    });

    it("re-folds long lines after adding SCHEDULE-AGENT", () => {
      // Create a line that will exceed 75 octets after adding SCHEDULE-AGENT=CLIENT
      const longName = "A".repeat(50);
      const input = `ATTENDEE;CN=${longName}:mailto:test@example.com\r\n`;
      const result = addScheduleAgentClient(input);
      // Unfold to check content
      const unfolded = result.replace(/\r?\n[ \t]/g, "");
      expect(unfolded).toContain("SCHEDULE-AGENT=CLIENT");
      // Result should be properly folded (contains fold markers)
      expect(result).toContain("\r\n ");
    });
  });

  describe("quoted parameter handling", () => {
    it("handles CN with quoted value containing colon", () => {
      const input = 'ATTENDEE;CN="Doe, John: CEO":mailto:john@example.com\r\n';
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
      expect(result).toContain('"Doe, John: CEO"');
      expect(result).toContain("mailto:john@example.com");
    });

    it("handles DIR parameter with http URL", () => {
      const input = 'ATTENDEE;DIR="http://example.com/user":mailto:test@example.com\r\n';
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
      expect(result).toContain("http://example.com/user");
    });

    it("handles multiple quoted parameters", () => {
      const input =
        'ATTENDEE;CN="John Doe";DIR="http://example.com/john":mailto:john@example.com\r\n';
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
    });
  });

  describe("different value URI schemes", () => {
    it("handles mailto: URI", () => {
      const input = "ATTENDEE:mailto:test@example.com\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
    });

    it("handles http: URI", () => {
      const input = "ATTENDEE:http://example.com/calendar/user\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
    });

    it("handles https: URI", () => {
      const input = "ATTENDEE:https://example.com/calendar/user\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
    });

    it("handles urn: URI", () => {
      const input = "ATTENDEE:urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
    });
  });

  describe("does not modify non-ATTENDEE lines", () => {
    it("does not modify ORGANIZER lines", () => {
      const input = "ORGANIZER:mailto:organizer@example.com\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toBe(input);
      expect(result).not.toContain("SCHEDULE-AGENT");
    });

    it("does not modify other iCal properties", () => {
      const input =
        "BEGIN:VEVENT\r\n" +
        "SUMMARY:Test Event\r\n" +
        "DTSTART:20240101T100000Z\r\n" +
        "DTEND:20240101T110000Z\r\n" +
        "END:VEVENT\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toBe(input);
    });

    it("only modifies ATTENDEE lines in a full iCal", () => {
      const input =
        "BEGIN:VCALENDAR\r\n" +
        "VERSION:2.0\r\n" +
        "BEGIN:VEVENT\r\n" +
        "SUMMARY:Test Event\r\n" +
        "ORGANIZER:mailto:organizer@example.com\r\n" +
        "ATTENDEE:mailto:attendee@example.com\r\n" +
        "END:VEVENT\r\n" +
        "END:VCALENDAR\r\n";
      const result = addScheduleAgentClient(input);

      // ATTENDEE should have SCHEDULE-AGENT
      expect(result).toMatch(/ATTENDEE.*SCHEDULE-AGENT=CLIENT/);

      // ORGANIZER should NOT have SCHEDULE-AGENT
      expect(result).toMatch(/ORGANIZER:mailto:organizer@example\.com/);
      expect(result).not.toMatch(/ORGANIZER.*SCHEDULE-AGENT/);
    });
  });

  describe("edge cases", () => {
    it("handles ATTENDEE at start of string", () => {
      const input = "ATTENDEE:mailto:test@example.com\r\nSUMMARY:Test\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
    });

    it("handles ATTENDEE at end of string", () => {
      const input = "SUMMARY:Test\r\nATTENDEE:mailto:test@example.com\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
    });

    it("handles email containing SCHEDULE-AGENT substring", () => {
      // Edge case: email address contains "SCHEDULE-AGENT" - should still add the parameter
      const input = "ATTENDEE:mailto:schedule-agent@example.com\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain(";SCHEDULE-AGENT=CLIENT");
      expect(result).toContain("mailto:schedule-agent@example.com");
    });

    it("handles CN containing SCHEDULE-AGENT substring", () => {
      const input = 'ATTENDEE;CN="Schedule-Agent Test":mailto:test@example.com\r\n';
      const result = addScheduleAgentClient(input);
      // Should add SCHEDULE-AGENT parameter since it's not in params section
      expect(result).toContain(";SCHEDULE-AGENT=CLIENT");
    });

    it("handles ATTENDEE with RSVP parameter", () => {
      const input = "ATTENDEE;RSVP=TRUE:mailto:test@example.com\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
      expect(result).toContain("RSVP=TRUE");
    });

    it("handles ATTENDEE with CUTYPE parameter", () => {
      const input = "ATTENDEE;CUTYPE=INDIVIDUAL:mailto:test@example.com\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
      expect(result).toContain("CUTYPE=INDIVIDUAL");
    });

    it("handles ATTENDEE with ROLE parameter", () => {
      const input = "ATTENDEE;ROLE=REQ-PARTICIPANT:mailto:test@example.com\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
      expect(result).toContain("ROLE=REQ-PARTICIPANT");
    });
  });

  describe("international names (UTF-8)", () => {
    it("handles Chinese name in CN", () => {
      const input = "ATTENDEE;CN=\u5f20\u4e09:mailto:zhang@example.com\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
      expect(result).toContain("\u5f20\u4e09");
    });

    it("handles Japanese name in CN", () => {
      const input = "ATTENDEE;CN=\u7530\u4e2d\u592a\u90ce:mailto:tanaka@example.com\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
      expect(result).toContain("\u7530\u4e2d\u592a\u90ce");
    });

    it("handles Arabic name in CN", () => {
      const input = "ATTENDEE;CN=\u0645\u062d\u0645\u062f:mailto:mohammed@example.com\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
    });

    it("handles emoji in CN", () => {
      const input = "ATTENDEE;CN=John \u{1F600}:mailto:john@example.com\r\n";
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
      expect(result).toContain("\u{1F600}");
    });

    it("properly folds long international names", () => {
      // Long Chinese name that will need folding
      const longName = "\u4e2d".repeat(30); // 30 * 3 = 90 bytes
      const input = `ATTENDEE;CN=${longName}:mailto:test@example.com\r\n`;
      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
      expect(result).toContain("\r\n "); // Should be folded
    });
  });

  describe("real-world iCal examples", () => {
    it("handles typical Cal.com generated iCal", () => {
      const input =
        "BEGIN:VCALENDAR\r\n" +
        "VERSION:2.0\r\n" +
        "PRODID:-//Cal.com//Cal.com//EN\r\n" +
        "BEGIN:VEVENT\r\n" +
        "UID:abc123@Cal.com\r\n" +
        "DTSTAMP:20240101T120000Z\r\n" +
        "DTSTART:20240115T100000Z\r\n" +
        "DTEND:20240115T110000Z\r\n" +
        "SUMMARY:30 Minute Meeting\r\n" +
        "ORGANIZER;CN=Host User:mailto:host@example.com\r\n" +
        "ATTENDEE;CN=Guest User;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:guest@example.com\r\n" +
        "END:VEVENT\r\n" +
        "END:VCALENDAR\r\n";

      const result = addScheduleAgentClient(input);

      // Unfold to check content (long lines may be folded per RFC 5545)
      const unfolded = result.replace(/\r?\n[ \t]/g, "");

      // ATTENDEE should have SCHEDULE-AGENT
      expect(unfolded).toMatch(/ATTENDEE.*SCHEDULE-AGENT=CLIENT.*mailto:guest@example\.com/);

      // ORGANIZER should NOT have SCHEDULE-AGENT
      expect(unfolded).not.toMatch(/ORGANIZER.*SCHEDULE-AGENT/);

      // Other properties should be unchanged
      expect(result).toContain("UID:abc123@Cal.com");
      expect(result).toContain("SUMMARY:30 Minute Meeting");
    });

    it("handles iCal with multiple attendees", () => {
      const input =
        "BEGIN:VEVENT\r\n" +
        "ORGANIZER:mailto:host@example.com\r\n" +
        "ATTENDEE;CN=User One:mailto:user1@example.com\r\n" +
        "ATTENDEE;CN=User Two:mailto:user2@example.com\r\n" +
        "ATTENDEE;CN=User Three:mailto:user3@example.com\r\n" +
        "END:VEVENT\r\n";

      const result = addScheduleAgentClient(input);

      // All three attendees should have SCHEDULE-AGENT
      const matches = result.match(/SCHEDULE-AGENT=CLIENT/g);
      expect(matches).toHaveLength(3);
    });

    it("handles Fastmail-style iCal", () => {
      const input =
        "BEGIN:VCALENDAR\r\n" +
        "VERSION:2.0\r\n" +
        "PRODID:-//Fastmail//Fastmail//EN\r\n" +
        "BEGIN:VEVENT\r\n" +
        "ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;\r\n" +
        " RSVP=TRUE;CN=Test User:mailto:test@fastmail.com\r\n" +
        "END:VEVENT\r\n" +
        "END:VCALENDAR\r\n";

      const result = addScheduleAgentClient(input);
      expect(result).toContain("SCHEDULE-AGENT=CLIENT");
    });
  });
});

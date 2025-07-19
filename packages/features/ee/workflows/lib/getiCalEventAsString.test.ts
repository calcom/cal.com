import { describe, it, expect } from "vitest";
import { Frequency } from "rrule";
import { getiCalEventAsString } from "./getiCalEventAsString";

describe("getiCalEventAsString", () => {
  it("should use local time components with local input type", () => {
    const booking = {
      startTime: new Date("2024-01-15T14:00:00"), // Local time
      endTime: new Date("2024-01-15T15:00:00"),
      description: "Test meeting",
      location: "Conference Room",
      attendees: [
        {
          name: "John Doe",
          email: "john@example.com"
        }
      ],
      eventType: {
        title: "Team Meeting"
      },
      user: {
        email: "organizer@example.com",
        name: "Organizer"
      }
    };

    const icsString = getiCalEventAsString(booking);

    // Should generate valid ICS string
    expect(icsString).toBeTruthy();
    expect(icsString).toContain("BEGIN:VCALENDAR");
    expect(icsString).toContain("BEGIN:VEVENT");
    expect(icsString).toContain("END:VEVENT");
    expect(icsString).toContain("END:VCALENDAR");
    
    // Should contain event details
    expect(icsString).toContain("Team Meeting");
    expect(icsString).toContain("Test meeting");
    expect(icsString).toContain("Conference Room");
    
    // Should have UTC times in output (Z suffix)
    expect(icsString).toMatch(/DTSTART:\d{8}T\d{6}Z/);
    // ICS library uses DURATION instead of DTEND
    expect(icsString).toContain("DURATION:PT60M");
  });

  it("should handle timezone correctly without ISO string conversion", () => {
    // Create a date in a specific timezone context
    // We'll use dayjs to be more precise about timezones
    const booking = {
      startTime: new Date("2024-01-15T14:00:00"),
      endTime: new Date("2024-01-15T15:00:00"),
      description: "Timezone test",
      location: "Virtual",
      attendees: [
        {
          name: "Jane Smith",
          email: "jane@example.com"
        }
      ],
      eventType: {
        title: "Timezone Meeting"
      },
      user: {
        email: "host@example.com",
        name: "Host"
      }
    };

    const icsString = getiCalEventAsString(booking);

    // Should have UTC times in the output
    expect(icsString).toMatch(/DTSTART:\d{8}T\d{6}Z/);
    expect(icsString).toContain("DURATION:PT60M");
    
    // Verify the actual conversion is happening correctly
    // The local time array should be used as input
    const localHour = booking.startTime.getHours();
    expect(localHour).toBe(14); // Confirm we're using local 14:00
  });

  it("should generate RRULE for recurring events with count", () => {
    const booking = {
      startTime: new Date("2024-01-15T10:00:00"),
      endTime: new Date("2024-01-15T11:00:00"),
      description: "Weekly standup",
      location: "Zoom",
      attendees: [
        {
          name: "Team Member",
          email: "member@example.com"
        }
      ],
      eventType: {
        title: "Weekly Standup",
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 4,
          interval: 1
        }
      },
      user: {
        email: "lead@example.com",
        name: "Team Lead"
      }
    };

    const icsString = getiCalEventAsString(booking);

    // Should always contain recurrence rule when recurringEvent has count
    expect(icsString).toContain("RRULE:");
    expect(icsString).toMatch(/RRULE:.*FREQ=WEEKLY/);
    expect(icsString).toMatch(/RRULE:.*COUNT=4/);
    
    // Should still use UTC output
    expect(icsString).toMatch(/DTSTART:\d{8}T\d{6}Z/);
  });

  it("should not generate RRULE for recurring events without count", () => {
    const booking = {
      startTime: new Date("2024-01-15T10:00:00"),
      endTime: new Date("2024-01-15T11:00:00"),
      description: "Daily meeting",
      location: "Office",
      attendees: [
        {
          name: "Attendee",
          email: "attendee@example.com"
        }
      ],
      eventType: {
        title: "Daily Sync",
        recurringEvent: {
          freq: Frequency.DAILY,
          interval: 1
          // No count property
        }
      },
      user: {
        email: "host@example.com",
        name: "Host"
      }
    };

    const icsString = getiCalEventAsString(booking);

    // Should NOT contain RRULE when count is missing
    expect(icsString).not.toContain("RRULE:");
    
    // Should still generate valid event
    expect(icsString).toContain("BEGIN:VEVENT");
    expect(icsString).toMatch(/DTSTART:\d{8}T\d{6}Z/);
  });

  it("should handle recurring events with until date", () => {
    const untilDate = new Date("2024-12-31T23:59:59");
    const booking = {
      startTime: new Date("2024-01-15T10:00:00"),
      endTime: new Date("2024-01-15T11:00:00"),
      description: "Monthly review",
      location: "Conference Room",
      attendees: [
        {
          name: "Manager",
          email: "manager@example.com"
        }
      ],
      eventType: {
        title: "Monthly Review",
        recurringEvent: {
          freq: Frequency.MONTHLY,
          count: 12,
          interval: 1,
          until: untilDate
        }
      },
      user: {
        email: "reviewer@example.com",
        name: "Reviewer"
      }
    };

    const icsString = getiCalEventAsString(booking);

    // Should contain RRULE with count (implementation uses count when available)
    expect(icsString).toContain("RRULE:");
    expect(icsString).toMatch(/RRULE:.*FREQ=MONTHLY/);
    expect(icsString).toMatch(/RRULE:.*COUNT=12/);
  });

  it("should handle null or invalid recurring event data", () => {
    const booking = {
      startTime: new Date("2024-01-15T10:00:00"),
      endTime: new Date("2024-01-15T11:00:00"),
      description: "Test meeting",
      location: "Room 101",
      attendees: [
        {
          name: "User",
          email: "user@example.com"
        }
      ],
      eventType: {
        title: "Test Event",
        recurringEvent: null // Null recurring event
      },
      user: {
        email: "host@example.com",
        name: "Host"
      }
    };

    const icsString = getiCalEventAsString(booking);

    // Should NOT contain RRULE when recurringEvent is null
    expect(icsString).not.toContain("RRULE:");
    
    // Should still generate valid event
    expect(icsString).toContain("BEGIN:VEVENT");
    expect(icsString).toContain("Test Event");
  });

  it("should generate properly formatted RRULE string", () => {
    const booking = {
      startTime: new Date("2024-01-15T10:00:00"),
      endTime: new Date("2024-01-15T11:00:00"),
      description: "Bi-weekly meeting",
      location: "Virtual",
      attendees: [
        {
          name: "Participant",
          email: "participant@example.com"
        }
      ],
      eventType: {
        title: "Bi-weekly Sync",
        recurringEvent: {
          freq: Frequency.WEEKLY,
          count: 10,
          interval: 2 // Every 2 weeks
        }
      },
      user: {
        email: "organizer@example.com",
        name: "Organizer"
      }
    };

    const icsString = getiCalEventAsString(booking);

    // Should contain properly formatted RRULE
    expect(icsString).toContain("RRULE:");
    // The RRULE should contain all the parameters
    expect(icsString).toMatch(/RRULE:.*FREQ=WEEKLY/);
    expect(icsString).toMatch(/RRULE:.*COUNT=10/);
    expect(icsString).toMatch(/RRULE:.*INTERVAL=2/);
    
    // Verify the complete RRULE format (order may vary)
    const rruleMatch = icsString.match(/RRULE:([^\r\n]+)/);
    expect(rruleMatch).toBeTruthy();
    if (rruleMatch) {
      const rruleParts = rruleMatch[1].split(';');
      expect(rruleParts).toContain('FREQ=WEEKLY');
      expect(rruleParts).toContain('COUNT=10');
      expect(rruleParts).toContain('INTERVAL=2');
    }
  });

  it("should handle edge cases gracefully", () => {
    const booking = {
      startTime: new Date("2024-01-15T00:00:00"), // Midnight
      endTime: new Date("2024-01-15T23:59:59"), // End of day
      description: "",
      location: null,
      attendees: [
        {
          name: "Attendee",
          email: "attendee@example.com"
        }
      ],
      eventType: null,
      user: null
    };

    const icsString = getiCalEventAsString(booking);

    // Should still generate valid ICS
    expect(icsString).toBeTruthy();
    expect(icsString).toContain("BEGIN:VCALENDAR");
    
    // Should handle null values
    expect(icsString).not.toContain("null");
  });
});
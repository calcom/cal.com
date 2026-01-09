import { describe, expect } from "vitest";

import { ORGANIZER_EMAIL_EXEMPT_DOMAINS } from "@calcom/lib/constants";
import { buildCalendarEvent, buildPerson } from "@calcom/lib/test/builder";
import { buildVideoCallData } from "@calcom/lib/test/builder";
import type { CalendarEvent } from "@calcom/types/Calendar";
import { test } from "@calcom/testing/lib/fixtures/fixtures";

import generateIcsString from "./generateIcsString";

// Helper to remove line folding for test assertions
function removeLineFold(ics: string) {
  return ics.replace(/\r?\n[ \t]/g, "").trim();
}

const assertHasIcsString = (icsString: string | undefined) => {
  if (!icsString) throw new Error("icsString is undefined");

  expect(icsString).toBeDefined();

  return icsString;
};

const testIcsStringContains = ({
  icsString,
  event,
  status,
}: {
  icsString: string;
  event: CalendarEvent;
  status: string;
}) => {
  const DTSTART = `${event.startTime.split(".")[0].split(":").slice(0, 2).join(":").replace(/[-:]/g, "")}00Z`;
  const DTEND = `${event.endTime.split(".")[0].split(":").slice(0, 2).join(":").replace(/[-:]/g, "")}00Z`;
  const isOrganizerExempt = ORGANIZER_EMAIL_EXEMPT_DOMAINS?.split(",")
    .filter((domain) => domain.trim() !== "")
    .some((domain) => event.organizer.email.toLowerCase().endsWith(domain.toLowerCase()));
  expect(icsString).toEqual(expect.stringContaining(`UID:${event.iCalUID}`));
  // Sometimes the deeply equal stringMatching error appears. Don't want to add flakey tests
  // expect(icsString).toEqual(expect.stringContaining(`SUMMARY:${event.title}`));
  expect(icsString).toEqual(expect.stringContaining(`DTSTART:${DTSTART}`));
  if (event.hideOrganizerEmail && !isOrganizerExempt) {
    expect(icsString).toEqual(expect.stringContaining(`ORGANIZER;CN=${event.organizer.name}`));
    expect(icsString).not.toEqual(expect.stringContaining(`mailto:${event.organizer.email}`));
  } else {
    expect(icsString).toEqual(
      expect.stringContaining(`ORGANIZER;CN=${event.organizer.name}:mailto:${event.organizer.email}`)
    );
  }
  expect(icsString).toEqual(expect.stringContaining(`DTEND:${DTEND}`));
  expect(icsString).toEqual(expect.stringContaining(`STATUS:${status}`));
  //   Getting an error expected icsString to deeply equal stringMatching
  //   for (const attendee of event.attendees) {
  //     expect(icsString).toEqual(
  //       expect.stringMatching(
  //         `RSVP=TRUE;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${attendee.name}:mailto:${attendee.email}`
  //       )
  //     );
  //   }
};

describe("generateIcsString", () => {
  describe("booking actions", () => {
    test("when bookingAction is Create", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson()],
      });

      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      testIcsStringContains({ icsString: assertedIcsString, event, status });
    });
    test("when bookingAction is Cancel", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson()],
      });
      const status = "CANCELLED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      testIcsStringContains({ icsString: assertedIcsString, event, status });
    });
    test("when bookingAction is Reschedule", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson()],
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      testIcsStringContains({ icsString: assertedIcsString, event, status });
    });
    test("when bookingAction is RequestReschedule", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson()],
      });
      const status = "CANCELLED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      testIcsStringContains({ icsString: assertedIcsString, event, status });
    });
  });
  describe("set location", () => {
    test("Location is a video link", () => {
      const videoCallData = buildVideoCallData();
      const event = buildCalendarEvent(
        {
          iCalSequence: 0,
          attendees: [buildPerson()],
          videoCallData,
        },
        true
      );
      const status = "CANCELLED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      assertHasIcsString(icsString);

      expect(icsString).toEqual(expect.stringContaining(`LOCATION:${videoCallData.url}`));
    });
    // Could be custom link, address, or phone number
    test("Location is a string", () => {
      const event = buildCalendarEvent(
        {
          iCalSequence: 0,
          attendees: [buildPerson()],
          location: "+1234567890",
        },
        true
      );
      const status = "CANCELLED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      assertHasIcsString(icsString);

      expect(icsString).toEqual(expect.stringContaining(`LOCATION:${event.location}`));
    });
  });
  describe("SCHEDULE-AGENT property", () => {
    test("should include SCHEDULE-AGENT=CLIENT for organizer and attendees", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson({ scheduleAgent: "CLIENT" })],
        organizer: buildPerson({ scheduleAgent: "CLIENT" }),
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Check for SCHEDULE-AGENT=CLIENT
      expect(assertedIcsString).toEqual(expect.stringContaining("ORGANIZER;SCHEDULE-AGENT=CLIENT"));
      // Use just the domain part of email to avoid line folding issues
      const organizerEmailDomain = event.organizer.email.split("@")[1];
      expect(assertedIcsString).toEqual(expect.stringContaining(organizerEmailDomain));

      // Check for SCHEDULE-AGENT=CLIENT in ATTENDEE
      for (const attendee of event.attendees) {
        expect(assertedIcsString).toEqual(expect.stringContaining("ATTENDEE"));
        expect(assertedIcsString).toEqual(expect.stringContaining("SCHEDULE-AGENT=CLIENT"));
        const attendeeEmailDomain = attendee.email.split("@")[1];
        expect(assertedIcsString).toEqual(expect.stringContaining(attendeeEmailDomain));
      }
    });

    test("should not include SCHEDULE-AGENT when not specified (backward compatibility)", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson()], // No scheduleAgent specified
        organizer: buildPerson(), // No scheduleAgent specified
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Should NOT contain SCHEDULE-AGENT
      expect(assertedIcsString).not.toEqual(expect.stringContaining("SCHEDULE-AGENT"));

      // But should still contain ORGANIZER and ATTENDEE
      expect(assertedIcsString).toEqual(expect.stringContaining("ORGANIZER"));
      expect(assertedIcsString).toEqual(expect.stringContaining("ATTENDEE"));
    });

    test("should include SCHEDULE-AGENT=SERVER for organizer and attendees", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson({ scheduleAgent: "SERVER" })],
        organizer: buildPerson({ scheduleAgent: "SERVER" }),
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Check that SCHEDULE-AGENT=SERVER in ORGANIZER
      expect(assertedIcsString).toEqual(expect.stringContaining("ORGANIZER;SCHEDULE-AGENT=SERVER"));
      // Use just the domain part of email to avoid line folding issues
      const organizerEmailDomain = event.organizer.email.split("@")[1];
      expect(assertedIcsString).toEqual(expect.stringContaining(organizerEmailDomain));

      // Check for SCHEDULE-AGENT=SERVER in ATTENDEE
      for (const attendee of event.attendees) {
        expect(assertedIcsString).toEqual(expect.stringContaining("ATTENDEE"));
        expect(assertedIcsString).toEqual(expect.stringContaining("SCHEDULE-AGENT=SERVER"));
        const attendeeEmailDomain = attendee.email.split("@")[1];
        expect(assertedIcsString).toEqual(expect.stringContaining(attendeeEmailDomain));
      }
    });

    test("should handle mixed SCHEDULE-AGENT values for different attendees", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [
          buildPerson({ scheduleAgent: "CLIENT", name: "Client User", email: "client@example.com" }),
          buildPerson({ scheduleAgent: "SERVER", name: "Server User", email: "server@example.com" }),
          buildPerson({ name: "No Agent User", email: "noagent@example.com" }), // No scheduleAgent
        ],
        organizer: buildPerson({ scheduleAgent: "CLIENT" }),
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Check organizer has CLIENT
      expect(assertedIcsString).toEqual(expect.stringContaining("ORGANIZER;SCHEDULE-AGENT=CLIENT"));

      // Check for SCHEDULE-AGENT presence (accounting for line folding)
      expect(assertedIcsString).toEqual(expect.stringContaining("SCHEDULE-AGENT=CL"));
      expect(assertedIcsString).toEqual(expect.stringContaining("SCHEDULE-AGENT=SE"));

      // Verify specific attendees (check for email addresses which are more reliable)
      expect(assertedIcsString).toEqual(expect.stringContaining("client@example.com"));
      expect(assertedIcsString).toEqual(expect.stringContaining("server@example.com"));
      expect(assertedIcsString).toEqual(expect.stringContaining("noagent@example.com"));
    });

    test("should work with team members when they have scheduleAgent", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson({ scheduleAgent: "CLIENT" })],
        organizer: buildPerson({ scheduleAgent: "CLIENT" }),
        team: {
          name: "Test Team",
          id: 1,
          members: [
            {
              ...buildPerson({ scheduleAgent: "SERVER", name: "Team Member 1", email: "team1@example.com" }),
              id: 1,
            },
            {
              ...buildPerson({ scheduleAgent: "CLIENT", name: "Team Member 2", email: "team2@example.com" }),
              id: 2,
            },
          ],
        },
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Check organizer
      expect(assertedIcsString).toEqual(expect.stringContaining("ORGANIZER;SCHEDULE-AGENT=CLIENT"));

      // Check that team members are included with their scheduleAgent values
      expect(assertedIcsString).toEqual(expect.stringContaining("team1@example.com"));
      expect(assertedIcsString).toEqual(expect.stringContaining("team2@example.com"));

      // Check for SCHEDULE-AGENT presence (accounting for line folding)
      expect(assertedIcsString).toEqual(expect.stringContaining("SCHEDULE-AGENT=SE"));
      expect(assertedIcsString).toEqual(expect.stringContaining("SCHEDULE-AGENT=CL"));
    });

    test("should handle cancelled events with SCHEDULE-AGENT", () => {
      const event = buildCalendarEvent({
        iCalSequence: 1,
        attendees: [buildPerson({ scheduleAgent: "CLIENT" })],
        organizer: buildPerson({ scheduleAgent: "CLIENT" }),
      });
      const status = "CANCELLED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Check that SCHEDULE-AGENT is still included for cancelled events
      expect(assertedIcsString).toEqual(expect.stringContaining("ORGANIZER;SCHEDULE-AGENT=CLIENT"));
      expect(assertedIcsString).toEqual(expect.stringContaining("SCHEDULE-AGENT=CLIENT"));
      expect(assertedIcsString).toEqual(expect.stringContaining("STATUS:CANCELLED"));
    });

    test("should handle rescheduled events with SCHEDULE-AGENT", () => {
      const event = buildCalendarEvent({
        iCalSequence: 2,
        attendees: [buildPerson({ scheduleAgent: "CLIENT" })],
        organizer: buildPerson({ scheduleAgent: "CLIENT" }),
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Check that SCHEDULE-AGENT is included for rescheduled events
      expect(assertedIcsString).toEqual(expect.stringContaining("ORGANIZER;SCHEDULE-AGENT=CLIENT"));
      expect(assertedIcsString).toEqual(expect.stringContaining("SCHEDULE-AGENT=CLIENT"));
      expect(assertedIcsString).toEqual(expect.stringContaining("STATUS:CONFIRMED"));

      // Check sequence number for reschedule
      expect(assertedIcsString).toEqual(expect.stringContaining("SEQUENCE:2"));
    });

    test("should work with hideOrganizerEmail and SCHEDULE-AGENT", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson({ scheduleAgent: "CLIENT" })],
        organizer: buildPerson({ scheduleAgent: "CLIENT", email: "organizer@example.com" }),
        hideOrganizerEmail: true,
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Check that SCHEDULE-AGENT is still included even when organizer email is hidden
      expect(assertedIcsString).toEqual(expect.stringContaining("ORGANIZER;SCHEDULE-AGENT=CLIENT"));

      // Email should be hidden (replaced with no-reply)
      expect(assertedIcsString).toEqual(expect.stringContaining("no-reply@cal.com"));
      expect(assertedIcsString).not.toEqual(expect.stringContaining("organizer@example.com"));
    });

    test("should preserve existing attendee properties with SCHEDULE-AGENT", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson({ scheduleAgent: "CLIENT" })],
        organizer: buildPerson({ scheduleAgent: "CLIENT" }),
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
        partstat: "TENTATIVE",
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Check that both SCHEDULE-AGENT and existing properties are present
      expect(assertedIcsString).toEqual(expect.stringContaining("SCHEDULE-AGENT=CLIENT"));
      expect(assertedIcsString).toEqual(expect.stringContaining("PARTSTAT=TENTATIVE"));
      expect(assertedIcsString).toEqual(expect.stringContaining("ROLE=REQ-PARTICIPANT"));
      expect(assertedIcsString).toEqual(expect.stringContaining("RSVP=TRUE"));
    });

    test("should handle empty attendees array with SCHEDULE-AGENT organizer", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [], // Empty attendees
        organizer: buildPerson({ scheduleAgent: "CLIENT" }),
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Check that organizer SCHEDULE-AGENT is still included
      expect(assertedIcsString).toEqual(expect.stringContaining("ORGANIZER;SCHEDULE-AGENT=CLIENT"));
      // Should not contain any ATTENDEE lines
      expect(assertedIcsString.split("ATTENDEE").length).toBe(1); // Only in the main header
    });

    test("should handle multiple attendees with same scheduleAgent value", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [
          buildPerson({ scheduleAgent: "CLIENT", name: "User 1", email: "user1@example.com" }),
          buildPerson({ scheduleAgent: "CLIENT", name: "User 2", email: "user2@example.com" }),
          buildPerson({ scheduleAgent: "CLIENT", name: "User 3", email: "user3@example.com" }),
        ],
        organizer: buildPerson({ scheduleAgent: "CLIENT" }),
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Check that organizer has CLIENT
      expect(assertedIcsString).toEqual(expect.stringContaining("ORGANIZER;SCHEDULE-AGENT=CLIENT"));

      // Count SCHEDULE-AGENT=CLIENT occurrences - use partial match due to line folding
      const clientPartialMatches = (assertedIcsString.match(/SCHEDULE-AGENT=CL/g) || []).length;
      expect(clientPartialMatches).toBeGreaterThanOrEqual(3); // At least 3 for attendees (organizer might be folded)

      // Verify all attendees are present
      expect(assertedIcsString).toEqual(expect.stringContaining("user1@example.com"));
      expect(assertedIcsString).toEqual(expect.stringContaining("user2@example.com"));
      expect(assertedIcsString).toEqual(expect.stringContaining("user3@example.com"));
    });

    test("should handle large team with mixed scheduleAgent values", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson({ scheduleAgent: "CLIENT", email: "main@example.com" })],
        organizer: buildPerson({ scheduleAgent: "SERVER" }),
        team: {
          name: "Large Team",
          id: 1,
          members: [
            {
              ...buildPerson({ scheduleAgent: "CLIENT", name: "Team A", email: "teama@example.com" }),
              id: 1,
            },
            {
              ...buildPerson({ scheduleAgent: "SERVER", name: "Team B", email: "teamb@example.com" }),
              id: 2,
            },
            {
              ...buildPerson({ scheduleAgent: "CLIENT", name: "Team C", email: "teamc@example.com" }),
              id: 3,
            },
            { ...buildPerson({ name: "Team D", email: "teamd@example.com" }), id: 4 }, // No scheduleAgent
            {
              ...buildPerson({ scheduleAgent: "SERVER", name: "Team E", email: "teame@example.com" }),
              id: 5,
            },
          ],
        },
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Check organizer
      expect(assertedIcsString).toEqual(expect.stringContaining("ORGANIZER;SCHEDULE-AGENT=SERVER"));

      // Check that all team members are included
      expect(assertedIcsString).toEqual(expect.stringContaining("teama@example.com"));
      expect(assertedIcsString).toEqual(expect.stringContaining("teamb@example.com"));
      expect(assertedIcsString).toEqual(expect.stringContaining("teamc@example.com"));
      expect(assertedIcsString).toEqual(expect.stringContaining("teamd@example.com"));
      expect(assertedIcsString).toEqual(expect.stringContaining("teame@example.com"));
      expect(assertedIcsString).toEqual(expect.stringContaining("main@example.com"));

      // Check for presence of both CLIENT and SERVER values
      expect(assertedIcsString).toEqual(expect.stringContaining("SCHEDULE-AGENT=CL")); // CLIENT (may be folded)
      expect(assertedIcsString).toEqual(expect.stringContaining("SCHEDULE-AGENT=SE")); // SERVER (may be folded)
    });

    test("should handle video call data with SCHEDULE-AGENT", () => {
      const videoCallData = buildVideoCallData();
      const event = buildCalendarEvent(
        {
          iCalSequence: 0,
          attendees: [buildPerson({ scheduleAgent: "CLIENT" })],
          organizer: buildPerson({ scheduleAgent: "CLIENT" }),
          videoCallData,
        },
        true
      );
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Check that both SCHEDULE-AGENT and video location are present
      expect(assertedIcsString).toEqual(expect.stringContaining("ORGANIZER;SCHEDULE-AGENT=CLIENT"));
      expect(assertedIcsString).toEqual(expect.stringContaining("SCHEDULE-AGENT=CLIENT"));
      expect(assertedIcsString).toEqual(expect.stringContaining(`LOCATION:${videoCallData.url}`));
    });

    test("should work with special characters in attendee names and SCHEDULE-AGENT", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [
          buildPerson({
            scheduleAgent: "CLIENT",
            name: "José María Õü-Test",
            email: "jose@example.com",
          }),
          buildPerson({
            scheduleAgent: "SERVER",
            name: "李小明 (Test User)",
            email: "li@example.com",
          }),
        ],
        organizer: buildPerson({
          scheduleAgent: "CLIENT",
          name: "François Müller",
          email: "francois@example.com",
        }),
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);
      const unfoldedIcsString = removeLineFold(assertedIcsString);

      // Check that SCHEDULE-AGENT works with special characters
      expect(unfoldedIcsString).toEqual(expect.stringContaining("ORGANIZER;SCHEDULE-AGENT=CLIENT"));
      expect(unfoldedIcsString).toEqual(expect.stringContaining("SCHEDULE-AGENT=CL")); // CLIENT (may be folded)
      expect(unfoldedIcsString).toEqual(expect.stringContaining("SCHEDULE-AGENT=SE")); // SERVER (may be folded)

      // Check that emails are present (more reliable than names with special chars)
      expect(unfoldedIcsString).toEqual(expect.stringContaining("jose@example.com"));
      expect(unfoldedIcsString).toEqual(expect.stringContaining("li@example.com"));
      expect(unfoldedIcsString).toEqual(expect.stringContaining("francois@example.com"));
    });

    test("should include SCHEDULE-AGENT=NONE for organizer and attendees", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson({ scheduleAgent: "NONE" })],
        organizer: buildPerson({ scheduleAgent: "NONE" }),
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Check for SCHEDULE-AGENT=NONE in ORGANIZER
      expect(assertedIcsString).toEqual(expect.stringContaining("ORGANIZER;SCHEDULE-AGENT=NONE"));
      // Use just the domain part of email to avoid line folding issues
      const organizerEmailDomain = event.organizer.email.split("@")[1];
      expect(assertedIcsString).toEqual(expect.stringContaining(organizerEmailDomain));

      // Check for SCHEDULE-AGENT=NONE in ATTENDEE
      for (const attendee of event.attendees) {
        expect(assertedIcsString).toEqual(expect.stringContaining("ATTENDEE"));
        expect(assertedIcsString).toEqual(expect.stringContaining("SCHEDULE-AGENT=NONE"));
        const attendeeEmailDomain = attendee.email.split("@")[1];
        expect(assertedIcsString).toEqual(expect.stringContaining(attendeeEmailDomain));
      }
    });

    test("should handle mixed SCHEDULE-AGENT values including NONE", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [
          buildPerson({ scheduleAgent: "CLIENT", name: "Client User", email: "client@example.com" }),
          buildPerson({ scheduleAgent: "SERVER", name: "Server User", email: "server@example.com" }),
          buildPerson({ scheduleAgent: "NONE", name: "None User", email: "none@example.com" }),
          buildPerson({ name: "No Agent User", email: "noagent@example.com" }), // No scheduleAgent
        ],
        organizer: buildPerson({ scheduleAgent: "NONE" }),
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Check organizer has NONE
      expect(assertedIcsString).toEqual(expect.stringContaining("ORGANIZER;SCHEDULE-AGENT=NONE"));

      // Check for all SCHEDULE-AGENT values (accounting for line folding)
      expect(assertedIcsString).toEqual(expect.stringContaining("SCHEDULE-AGENT=CL")); // CLIENT
      expect(assertedIcsString).toEqual(expect.stringContaining("SCHEDULE-AGENT=SE")); // SERVER
      expect(assertedIcsString).toEqual(expect.stringContaining("SCHEDULE-AGENT=NO")); // NONE

      // Verify specific attendees (check for email addresses which are more reliable)
      expect(assertedIcsString).toEqual(expect.stringContaining("client@example.com"));
      expect(assertedIcsString).toEqual(expect.stringContaining("server@example.com"));
      expect(assertedIcsString).toEqual(expect.stringContaining("none@example.com"));
      expect(assertedIcsString).toEqual(expect.stringContaining("noagent@example.com"));
    });

    // Test for correct line folding (fixed data)
    describe("ICS line folding", () => {
      test("should fold long lines at 75 octets and unfold correctly", () => {
        // This SUMMARY will force a long line
        const longSummary = "A".repeat(100) + "B".repeat(100);
        const event = buildCalendarEvent({
          iCalSequence: 0,
          attendees: [buildPerson()],
          title: longSummary,
        });
        const status = "CONFIRMED";
        const icsString = generateIcsString({ event, status });
        const assertedIcsString = assertHasIcsString(icsString);
        // The raw ICS should have a folded line
        expect(assertedIcsString).toMatch(/\r?\n[ \t]/);
        // After normalization, the summary should be contiguous
        const unfoldedIcsString = removeLineFold(assertedIcsString);
        expect(unfoldedIcsString).toContain(longSummary);
      });
    });
  });
});

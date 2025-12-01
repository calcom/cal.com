import { describe, expect } from "vitest";

import { ORGANIZER_EMAIL_EXEMPT_DOMAINS } from "@calcom/lib/constants";
import { buildCalendarEvent, buildPerson } from "@calcom/lib/test/builder";
import { buildVideoCallData } from "@calcom/lib/test/builder";
import type { CalendarEvent } from "@calcom/types/Calendar";
import { test } from "@calcom/web/test/fixtures/fixtures";

import generateIcsString from "./generateIcsString";

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

  // Check organizer name visibility
  if (event.hideOrganizerName) {
    expect(icsString).toEqual(expect.stringContaining(`ORGANIZER;CN=Organizer`));
    expect(icsString).not.toEqual(expect.stringContaining(`CN=${event.organizer.name}`));
  } else {
    expect(icsString).toEqual(expect.stringContaining(`CN=${event.organizer.name}`));
  }

  // Check organizer email visibility
  if (event.hideOrganizerEmail && !isOrganizerExempt) {
    expect(icsString).not.toEqual(expect.stringContaining(`mailto:${event.organizer.email}`));
  } else {
    expect(icsString).toEqual(expect.stringContaining(`mailto:${event.organizer.email}`));
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
  describe("hideOrganizerName", () => {
    test("when hideOrganizerName is true", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson()],
        hideOrganizerName: true,
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Should contain "Organizer" as the name
      expect(assertedIcsString).toEqual(expect.stringContaining(`ORGANIZER;CN=Organizer`));
      // Should NOT contain the actual organizer name
      expect(assertedIcsString).not.toEqual(expect.stringContaining(`CN=${event.organizer.name}`));
      // Email should still be present (unless hideOrganizerEmail is also true)
      expect(assertedIcsString).toEqual(expect.stringContaining(`mailto:${event.organizer.email}`));
    });
    test("when both hideOrganizerName and hideOrganizerEmail are true", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson()],
        hideOrganizerName: true,
        hideOrganizerEmail: true,
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Should contain "Organizer" as the name
      expect(assertedIcsString).toEqual(expect.stringContaining(`ORGANIZER;CN=Organizer`));
      // Should NOT contain the actual organizer name
      expect(assertedIcsString).not.toEqual(expect.stringContaining(`CN=${event.organizer.name}`));
      // Should NOT contain the actual organizer email
      expect(assertedIcsString).not.toEqual(expect.stringContaining(`mailto:${event.organizer.email}`));
    });
  });
  describe("team events with hideOrganizerName and hideOrganizerEmail", () => {
    test("when hideOrganizerEmail is true for team event, all team members emails should be hidden", () => {
      const teamMember1 = buildPerson({ name: "Team Member 1", email: "member1@example.com" });
      const teamMember2 = buildPerson({ name: "Team Member 2", email: "member2@example.com" });

      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson()],
        hideOrganizerEmail: true,
        team: {
          id: 1,
          name: "Test Team",
          members: [teamMember1, teamMember2],
        },
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Team members should not have their actual emails
      expect(assertedIcsString).not.toEqual(expect.stringContaining(teamMember1.email));
      expect(assertedIcsString).not.toEqual(expect.stringContaining(teamMember2.email));
      // Should use no-reply instead
      expect(assertedIcsString).toEqual(expect.stringContaining("no-reply@cal.com"));
    });

    test("when hideOrganizerName is true for team event, all team members names should be hidden", () => {
      const teamMember1 = buildPerson({ name: "Team Member 1", email: "member1@example.com" });
      const teamMember2 = buildPerson({ name: "Team Member 2", email: "member2@example.com" });

      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson()],
        hideOrganizerName: true,
        team: {
          id: 1,
          name: "Test Team",
          members: [teamMember1, teamMember2],
        },
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Team members should not have their actual names
      expect(assertedIcsString).not.toEqual(expect.stringContaining(teamMember1.name));
      expect(assertedIcsString).not.toEqual(expect.stringContaining(teamMember2.name));
      // Should show "Organizer" instead
      expect(assertedIcsString).toEqual(expect.stringContaining("CN=Organizer"));
    });

    test("when both flags are true for team event, all team members details should be hidden", () => {
      const teamMember1 = buildPerson({ name: "Team Member 1", email: "member1@example.com" });
      const teamMember2 = buildPerson({ name: "Team Member 2", email: "member2@example.com" });

      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson()],
        hideOrganizerName: true,
        hideOrganizerEmail: true,
        team: {
          id: 1,
          name: "Test Team",
          members: [teamMember1, teamMember2],
        },
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      const assertedIcsString = assertHasIcsString(icsString);

      // Team members should not have their actual names
      expect(assertedIcsString).not.toEqual(expect.stringContaining(teamMember1.name));
      expect(assertedIcsString).not.toEqual(expect.stringContaining(teamMember2.name));
      // Team members should not have their actual emails
      expect(assertedIcsString).not.toEqual(expect.stringContaining(teamMember1.email));
      expect(assertedIcsString).not.toEqual(expect.stringContaining(teamMember2.email));
    });
  });
});

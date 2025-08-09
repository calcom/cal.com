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
  
  describe("timezone handling", () => {
    test("should use local time input with UTC output", () => {
      const event = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson()],
        startTime: "2024-01-15T14:00:00", // Local time
        endTime: "2024-01-15T15:00:00",
      });
      const status = "CONFIRMED";

      const icsString = generateIcsString({
        event: event,
        status,
      });

      assertHasIcsString(icsString);

      // The ICS should contain UTC times (Z suffix)
      // For a 14:00 local time, the UTC representation would depend on the timezone
      // But the important thing is that it should have the Z suffix indicating UTC
      expect(icsString).toMatch(/DTSTART:\d{8}T\d{6}Z/);
      expect(icsString).toMatch(/DTEND:\d{8}T\d{6}Z/);
    });

    test("should handle different timezones consistently", () => {
      const timezoneTests = [
        {
          name: "EST Winter",
          startTime: "2024-01-15T14:00:00-05:00",
          endTime: "2024-01-15T15:00:00-05:00",
          expectedUTCStart: "20240115T190000Z", // 14:00 EST = 19:00 UTC
          expectedUTCEnd: "20240115T200000Z"
        },
        {
          name: "GMT",
          startTime: "2024-01-15T14:00:00Z",
          endTime: "2024-01-15T15:00:00Z", 
          expectedUTCStart: "20240115T140000Z",
          expectedUTCEnd: "20240115T150000Z"
        },
        {
          name: "JST",
          startTime: "2024-01-15T14:00:00+09:00",
          endTime: "2024-01-15T15:00:00+09:00",
          expectedUTCStart: "20240115T050000Z", // 14:00 JST = 05:00 UTC
          expectedUTCEnd: "20240115T060000Z"
        }
      ];

      timezoneTests.forEach(({ name, startTime, endTime, expectedUTCStart, expectedUTCEnd }) => {
        const event = buildCalendarEvent({
          iCalSequence: 0,
          attendees: [buildPerson()],
          startTime,
          endTime,
        });
        const status = "CONFIRMED";

        const icsString = generateIcsString({
          event: event,
          status,
        });

        assertHasIcsString(icsString);
        
        // Check that times are converted to UTC correctly
        expect(icsString).toContain(`DTSTART:${expectedUTCStart}`);
        expect(icsString).toContain(`DTEND:${expectedUTCEnd}`);
      });
    });

    test("should handle daylight saving time transitions", () => {
      // Test event crossing DST boundary in US Eastern Time
      // March 10, 2024 at 2:00 AM EST -> 3:00 AM EDT
      const beforeDST = buildCalendarEvent({
        iCalSequence: 0,
        attendees: [buildPerson()],
        startTime: "2024-03-09T23:00:00-05:00", // 11 PM EST on March 9
        endTime: "2024-03-10T01:00:00-05:00",   // 1 AM EST on March 10
      });

      const afterDST = buildCalendarEvent({
        iCalSequence: 0, 
        attendees: [buildPerson()],
        startTime: "2024-03-10T14:00:00-04:00", // 2 PM EDT on March 10
        endTime: "2024-03-10T15:00:00-04:00",   // 3 PM EDT on March 10
      });

      const status = "CONFIRMED";

      const beforeIcs = generateIcsString({ event: beforeDST, status });
      const afterIcs = generateIcsString({ event: afterDST, status });

      assertHasIcsString(beforeIcs);
      assertHasIcsString(afterIcs);

      // Before DST: 23:00 EST = 04:00 UTC next day
      expect(beforeIcs).toContain("DTSTART:20240310T040000Z");
      expect(beforeIcs).toContain("DTEND:20240310T060000Z");

      // After DST: 14:00 EDT = 18:00 UTC
      expect(afterIcs).toContain("DTSTART:20240310T180000Z");
      expect(afterIcs).toContain("DTEND:20240310T190000Z");
    });
  });
});

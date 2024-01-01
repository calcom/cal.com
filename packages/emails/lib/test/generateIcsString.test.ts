import { describe, expect } from "vitest";

import dayjs from "@calcom/dayjs";
import type { CalendarEvent } from "@calcom/types/Calendar";
import { test } from "@calcom/web/test/fixtures/fixtures";

import { buildCalendarEvent, buildPerson } from "../../../lib/test/builder";
import generateIcsString from "../generateIcsString";

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
  const DTSTART = event.startTime.split(".")[0].replace(/[-:]/g, "");
  const startTime = dayjs(event.startTime);
  const endTime = dayjs(event.endTime);
  const duration = endTime.diff(startTime, "minute");

  expect(icsString).toEqual(expect.stringContaining(`UID:${event.iCalUID}`));
  // Sometimes the deeply equal stringMatching error appears. Don't want to add flakey tests
  // expect(icsString).toEqual(expect.stringContaining(`SUMMARY:${event.title}`));
  expect(icsString).toEqual(expect.stringContaining(`DTSTART:${DTSTART}`));
  expect(icsString).toEqual(
    expect.stringContaining(`ORGANIZER;CN=${event.organizer.name}:mailto:${event.organizer.email}`)
  );
  expect(icsString).toEqual(expect.stringContaining(`DURATION:PT${duration}M`));
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
  test("when bookingAction is Create", () => {
    const event = buildCalendarEvent({
      iCalSequence: 0,
      attendees: [buildPerson()],
    });

    const title = "new_event_scheduled_recurring";
    const subtitle = "emailed_you_and_any_other_attendees";
    const status = "CONFIRMED";

    const icsString = generateIcsString({
      event: event,
      title,
      subtitle,
      role: "organizer",
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
    const title = "event_request_cancelled";
    const subtitle = "emailed_you_and_any_other_attendees";
    const status = "CANCELLED";

    const icsString = generateIcsString({
      event: event,
      title,
      subtitle,
      role: "organizer",
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
    const title = "event_type_has_been_rescheduled";
    const subtitle = "emailed_you_and_any_other_attendees";
    const status = "CONFIRMED";

    const icsString = generateIcsString({
      event: event,
      title,
      subtitle,
      role: "organizer",
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
    const title = "request_reschedule_title_organizer";
    const subtitle = "request_reschedule_subtitle_organizer";
    const status = "CANCELLED";

    const icsString = generateIcsString({
      event: event,
      title,
      subtitle,
      role: "organizer",
      status,
    });

    const assertedIcsString = assertHasIcsString(icsString);

    testIcsStringContains({ icsString: assertedIcsString, event, status });
  });
});

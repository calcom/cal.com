import { describe, expect } from "vitest";

import dayjs from "@calcom/dayjs";
import type { CalendarEvent } from "@calcom/types/Calendar";
import { test } from "@calcom/web/test/fixtures/fixtures";

import { buildCalendarEvent, buildPerson } from "../../../lib/test/builder";
import generateIcsString, { BookingAction } from "../generateIcsString";

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
  expect(icsString).toEqual(expect.stringContaining(`SUMMARY:${event.title}`));
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
    const icsString = generateIcsString({
      event,
      t: event.organizer.language.translate,
      bookingAction: BookingAction.Create,
      role: "organizer",
    });

    expect(icsString).toBeDefined();

    testIcsStringContains({ icsString, event, status: "CONFIRMED" });
  });
  test("when bookingAction is Cancel", () => {
    const event = buildCalendarEvent({
      iCalSequence: 0,
      attendees: [buildPerson()],
    });
    const icsString = generateIcsString({
      event,
      t: event.organizer.language.translate,
      bookingAction: BookingAction.Cancel,
      role: "organizer",
    });

    expect(icsString).toBeDefined();

    testIcsStringContains({ icsString, event, status: "CANCELLED" });
  });
  test("when bookingAction is Reschedule", () => {
    const event = buildCalendarEvent({
      iCalSequence: 0,
      attendees: [buildPerson()],
    });
    const icsString = generateIcsString({
      event,
      t: event.organizer.language.translate,
      bookingAction: BookingAction.Reschedule,
      role: "organizer",
    });

    expect(icsString).toBeDefined();

    testIcsStringContains({ icsString, event, status: "CONFIRMED" });
  });
  test("when bookingAction is RequestReschedule", () => {
    const event = buildCalendarEvent({
      iCalSequence: 0,
      attendees: [buildPerson()],
    });
    const icsString = generateIcsString({
      event,
      t: event.organizer.language.translate,
      bookingAction: BookingAction.RequestReschedule,
      role: "organizer",
    });

    expect(icsString).toBeDefined();

    testIcsStringContains({ icsString, event, status: "CANCELLED" });
  });
});

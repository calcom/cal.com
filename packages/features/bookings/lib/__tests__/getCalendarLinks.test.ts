/**
 * Regression tests for https://github.com/calcom/cal.diy/issues/28884
 *
 * Bug: The "Add to Google Calendar" link on the booking page always generated
 * a "create new event" URL, even when the booking was already synced to Google
 * Calendar. This created a duplicate event in the user's calendar.
 *
 * Fix: When a booking has a linked Google Calendar event (googleCalendarEventId),
 * build a direct link to that existing event instead of a "create new" link.
 */

import { describe, expect, it } from "vitest";
import { getCalendarLinks } from "../getCalendarLinks";
import { Prisma } from "@calcom/prisma/client";

const t = (key: string) => key;

function buildBooking(overrides: Record<string, unknown> = {}) {
  return {
    title: "Test Meeting",
    startTime: new Date("2026-05-22T10:00:00Z"),
    endTime: new Date("2026-05-22T10:30:00Z"),
    location: "",
    responses: { name: "Attendee" } as Prisma.JsonObject,
    metadata: null,
    googleCalendarEventId: null,
    googleCalendarId: null,
    ...overrides,
  };
}

const baseEventType = {
  recurringEvent: null,
  title: "Test Meeting",
  description: null,
  eventName: null,
  isDynamic: false,
  length: 30,
  team: null,
  users: [{ name: "Host User" }],
};

describe("getCalendarLinks — Google Calendar link generation (#28884)", () => {

  it("returns a direct Google Calendar event link when googleCalendarEventId is present", () => {
    // Core fix assertion. Before the fix, this always returned a "create new event"
    // link even when the booking was already synced to Google Calendar.
    const links = getCalendarLinks({
      booking: buildBooking({
        googleCalendarEventId: "abc123eventid",
        googleCalendarId: "host@example.com",
      }),
      eventType: baseEventType,
      t,
    });

    const googleLink = links.find((l) => l.label === "Google Calendar");
    expect(googleLink?.link).toMatch(/^https:\/\/calendar\.google\.com\/calendar\/event\?eid=/);
    // Must NOT be a "create" link — that would open a new event form
    expect(googleLink?.link).not.toContain("calendar/r/eventedit");
  });

  it("falls back to the create-new-event link when no Google Calendar event is synced", () => {
    // Bookings without a connected Google Calendar still get a "create" link
    // so users can manually add it — existing behaviour must not break.
    const links = getCalendarLinks({
      booking: buildBooking({
        googleCalendarEventId: null,
        googleCalendarId: null,
      }),
      eventType: baseEventType,
      t,
    });

    const googleLink = links.find((l) => l.label === "Google Calendar");
    expect(googleLink?.link).toContain("calendar/r/eventedit");
  });

  it("encodes the event link correctly using the event ID and calendar ID", () => {
    // The eid param is base64(eventId + " " + calendarId) with URL-safe encoding.
    // If this encoding is wrong, Google Calendar won't find the event.
    const eventId = "abc123eventid";
    const calendarId = "host@example.com";

    const links = getCalendarLinks({
      booking: buildBooking({
        googleCalendarEventId: eventId,
        googleCalendarId: calendarId,
      }),
      eventType: baseEventType,
      t,
    });

    const googleLink = links.find((l) => l.label === "Google Calendar");
    const url = new URL(googleLink!.link);
    const eid = url.searchParams.get("eid");

    const decoded = atob(eid!.replace(/-/g, "+").replace(/_/g, "/"));
    expect(decoded).toBe(`${eventId} ${calendarId}`);
  });

  it("falls back to primary calendar when googleCalendarId is missing", () => {
    // If we have an event ID but no calendar ID, default to "primary"
    // so the link still works for most users.
    const eventId = "abc123eventid";

    const links = getCalendarLinks({
      booking: buildBooking({
        googleCalendarEventId: eventId,
        googleCalendarId: null,
      }),
      eventType: baseEventType,
      t,
    });

    const googleLink = links.find((l) => l.label === "Google Calendar");
    const url = new URL(googleLink!.link);
    const eid = url.searchParams.get("eid");

    const decoded = atob(eid!.replace(/-/g, "+").replace(/_/g, "/"));
    expect(decoded).toContain("primary");
  });

});
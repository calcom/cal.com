import type { BookingReference } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
import { describe, expect, it } from "vitest";
import { addVideoCallDataToEvent } from "./addVideoCallDataToEvent";

function makeBookingReference(overrides: Partial<BookingReference> = {}): BookingReference {
  return {
    id: 1,
    type: "daily_video",
    uid: "ref-uid-1",
    meetingId: "meeting-123",
    meetingPassword: "pass123",
    meetingUrl: "https://daily.co/room-abc",
    externalCalendarId: null,
    deleted: false,
    bookingId: null,
    credentialId: null,
    thirdPartyRecurringEventId: null,
    ...overrides,
  };
}

function makeCalendarEvent(): CalendarEvent {
  return {
    type: "30min",
    title: "Test Meeting",
    startTime: "2025-06-01T10:00:00Z",
    endTime: "2025-06-01T10:30:00Z",
    organizer: {
      email: "organizer@example.com",
      name: "Organizer",
      timeZone: "UTC",
      language: {
        translate: ((key: string) => key) as unknown as CalendarEvent["organizer"]["language"]["translate"],
        locale: "en",
      },
    },
    attendees: [],
    description: "",
    language: "en",
  } as unknown as CalendarEvent;
}

describe("addVideoCallDataToEvent", () => {
  it("adds video call data from a video reference to the event", () => {
    const refs = [
      makeBookingReference({
        type: "daily_video",
        meetingId: "mtg-1",
        meetingPassword: "pw",
        meetingUrl: "https://daily.co/room",
      }),
    ];
    const evt = makeCalendarEvent();

    const result = addVideoCallDataToEvent(refs, evt);

    expect(result.videoCallData).toEqual({
      type: "daily_video",
      id: "mtg-1",
      password: "pw",
      url: "https://daily.co/room",
    });
  });

  it("does not set videoCallData when no video reference exists", () => {
    const refs = [makeBookingReference({ type: "google_calendar" })];
    const evt = makeCalendarEvent();

    const result = addVideoCallDataToEvent(refs, evt);

    expect(result.videoCallData).toBeUndefined();
  });

  it("picks the first video reference when multiple exist", () => {
    const refs = [
      makeBookingReference({ type: "daily_video", meetingUrl: "https://daily.co/first" }),
      makeBookingReference({ type: "zoom_video", meetingUrl: "https://zoom.us/second" }),
    ];
    const evt = makeCalendarEvent();

    const result = addVideoCallDataToEvent(refs, evt);

    expect(result.videoCallData?.url).toBe("https://daily.co/first");
  });

  it("handles null meetingPassword", () => {
    const refs = [makeBookingReference({ type: "daily_video", meetingPassword: null })];
    const evt = makeCalendarEvent();

    const result = addVideoCallDataToEvent(refs, evt);

    expect(result.videoCallData?.password).toBeNull();
  });

  it("returns the same event object (mutates in place)", () => {
    const refs = [makeBookingReference({ type: "daily_video" })];
    const evt = makeCalendarEvent();

    const result = addVideoCallDataToEvent(refs, evt);

    expect(result).toBe(evt);
  });
});

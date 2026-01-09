import { GoogleCalendarEventResponse } from "../get-calendar-event-details-output-pipe";

export const createGoogleCalendarEventFixture = (
  overrides: Partial<GoogleCalendarEventResponse> = {}
): GoogleCalendarEventResponse => {
  const baseEvent: GoogleCalendarEventResponse = {
    kind: "calendar#event",
    etag: "test-etag",
    id: "test-event-id",
    status: "confirmed",
    htmlLink: "https://calendar.google.com/event",
    created: "2024-01-01T00:00:00Z",
    updated: "2024-01-01T00:00:00Z",
    summary: "Test Meeting",
    description: "Test description",
    creator: {
      email: "creator@example.com",
      displayName: "Creator Name",
    },
    organizer: {
      email: "organizer@example.com",
      displayName: "Organizer Name",
    },
    start: {
      dateTime: "2024-01-15T10:00:00Z",
      timeZone: "America/New_York",
    },
    end: {
      dateTime: "2024-01-15T11:00:00Z",
      timeZone: "America/New_York",
    },
    iCalUID: "test-ical-uid",
    sequence: 0,
    attendees: [
      {
        email: "attendee@example.com",
        displayName: "Attendee Name",
        responseStatus: "accepted",
        organizer: false,
      },
      {
        email: "organizer@example.com",
        displayName: "Organizer Name",
        responseStatus: "accepted",
        organizer: true,
      },
    ],
    conferenceData: {
      conferenceId: "abc-def-ghi",
      entryPoints: [
        {
          entryPointType: "video",
          uri: "https://meet.google.com/abc-def-ghi",
          label: "meet.google.com/abc-def-ghi",
        },
      ],
      conferenceSolution: {
        key: {
          type: "hangoutsMeet",
        },
        name: "Google Meet",
        iconUri:
          "https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png",
      },
    },
    hangoutLink: "https://meet.google.com/abc-def-ghi",
  };

  return { ...baseEvent, ...overrides };
};

export const googleEventWithConferenceData = createGoogleCalendarEventFixture({
  conferenceData: {
    conferenceId: "test-conference-id",
    entryPoints: [
      {
        entryPointType: "video",
        uri: "https://meet.google.com/abc-def-ghi",
        label: "Google Meet",
        pin: "123456",
        regionCode: "US",
      },
      {
        entryPointType: "phone",
        uri: "tel:+1-555-123-4567",
        label: "Phone",
        pin: "789012",
      },
    ],
  },
});

export const googleEventWithLocationOnly = createGoogleCalendarEventFixture({
  location: "123 Main St, City, State",
  conferenceData: undefined,
  hangoutLink: undefined,
});

export const googleEventWithHangoutLink = createGoogleCalendarEventFixture({
  hangoutLink: "https://hangouts.google.com/call/abc123",
  conferenceData: undefined,
  location: undefined,
});

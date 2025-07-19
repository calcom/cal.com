import {
  CalendarEventResponseStatus,
  CalendarEventStatus,
  UnifiedCalendarEventOutput,
} from "../outputs/get-unified-calendar-event";
import {
  GoogleCalendarEventOutputPipe,
  GoogleCalendarEventResponse,
} from "./get-calendar-event-details-output-pipe";

describe("GoogleCalendarEventOutputPipe", () => {
  let pipe: GoogleCalendarEventOutputPipe;

  beforeEach(() => {
    pipe = new GoogleCalendarEventOutputPipe();
  });

  describe("transform", () => {
    it("should transform Google Calendar event to unified format", () => {
      const googleEvent: GoogleCalendarEventResponse = {
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
            optional: false,
          },
          {
            email: "organizer@example.com",
            displayName: "Organizer Name",
            responseStatus: "accepted",
            organizer: true,
            optional: false,
          },
        ],
      };

      const result = pipe.transform(googleEvent);

      expect(result.id).toBe("test-event-id");
      expect(result.title).toBe("Test Meeting");
      expect(result.description).toBe("Test description");
      expect(result.source).toBe("google");
      expect(result.status).toBe(CalendarEventStatus.ACCEPTED);
      expect(result.start.time).toBe("2024-01-15T10:00:00Z");
      expect(result.start.timeZone).toBe("America/New_York");
      expect(result.end.time).toBe("2024-01-15T11:00:00Z");
      expect(result.end.timeZone).toBe("America/New_York");
      expect(result.attendees).toHaveLength(1);
      expect(result.attendees![0].email).toBe("attendee@example.com");
      expect(result.hosts).toHaveLength(1);
      expect(result.hosts![0].email).toBe("organizer@example.com");
    });

    it("should handle event without description", () => {
      const googleEvent: GoogleCalendarEventResponse = {
        kind: "calendar#event",
        etag: "test-etag",
        id: "test-event-id",
        status: "confirmed",
        htmlLink: "https://calendar.google.com/event",
        created: "2024-01-01T00:00:00Z",
        updated: "2024-01-01T00:00:00Z",
        summary: "Test Meeting",
        creator: {
          email: "creator@example.com",
        },
        organizer: {
          email: "organizer@example.com",
        },
        start: {
          dateTime: "2024-01-15T10:00:00Z",
          timeZone: "UTC",
        },
        end: {
          dateTime: "2024-01-15T11:00:00Z",
          timeZone: "UTC",
        },
        iCalUID: "test-ical-uid",
        sequence: 0,
      };

      const result = pipe.transform(googleEvent);
      expect(result.description).toBeNull();
    });

    it("should handle event without attendees", () => {
      const googleEvent: GoogleCalendarEventResponse = {
        kind: "calendar#event",
        etag: "test-etag",
        id: "test-event-id",
        status: "confirmed",
        htmlLink: "https://calendar.google.com/event",
        created: "2024-01-01T00:00:00Z",
        updated: "2024-01-01T00:00:00Z",
        summary: "Test Meeting",
        creator: {
          email: "creator@example.com",
        },
        organizer: {
          email: "organizer@example.com",
          displayName: "Organizer Name",
        },
        start: {
          dateTime: "2024-01-15T10:00:00Z",
          timeZone: "UTC",
        },
        end: {
          dateTime: "2024-01-15T11:00:00Z",
          timeZone: "UTC",
        },
        iCalUID: "test-ical-uid",
        sequence: 0,
      };

      const result = pipe.transform(googleEvent);
      expect(result.attendees).toBeUndefined();
      expect(result.hosts).toHaveLength(1);
      expect(result.hosts![0].email).toBe("organizer@example.com");
    });
  });

  describe("transformDateTimeWithZone", () => {
    it("should transform Google date time to unified format", () => {
      const googleDateTime = {
        dateTime: "2024-01-15T10:00:00Z",
        timeZone: "America/New_York",
      };

      const result = pipe["transformDateTimeWithZone"](googleDateTime);

      expect(result.time).toBe("2024-01-15T10:00:00Z");
      expect(result.timeZone).toBe("America/New_York");
    });
  });

  describe("transformAttendeeResponseStatus", () => {
    it("should transform accepted status", () => {
      const result = pipe["transformAttendeeResponseStatus"]("accepted");
      expect(result).toBe(CalendarEventResponseStatus.ACCEPTED);
    });

    it("should transform tentative status", () => {
      const result = pipe["transformAttendeeResponseStatus"]("tentative");
      expect(result).toBe(CalendarEventResponseStatus.PENDING);
    });

    it("should transform declined status", () => {
      const result = pipe["transformAttendeeResponseStatus"]("declined");
      expect(result).toBe(CalendarEventResponseStatus.DECLINED);
    });

    it("should transform needsaction status", () => {
      const result = pipe["transformAttendeeResponseStatus"]("needsaction");
      expect(result).toBe(CalendarEventResponseStatus.NEEDS_ACTION);
    });

    it("should handle case insensitive status", () => {
      const result = pipe["transformAttendeeResponseStatus"]("ACCEPTED");
      expect(result).toBe(CalendarEventResponseStatus.ACCEPTED);
    });

    it("should handle unknown status", () => {
      const result = pipe["transformAttendeeResponseStatus"]("unknown");
      expect(result).toBeNull();
    });

    it("should handle null status", () => {
      const result = pipe["transformAttendeeResponseStatus"](undefined);
      expect(result).toBeNull();
    });
  });

  describe("transformEventStatus", () => {
    it("should transform confirmed status", () => {
      const result = pipe["transformEventStatus"]("confirmed");
      expect(result).toBe(CalendarEventStatus.ACCEPTED);
    });

    it("should transform tentative status", () => {
      const result = pipe["transformEventStatus"]("tentative");
      expect(result).toBe(CalendarEventStatus.PENDING);
    });

    it("should transform cancelled status", () => {
      const result = pipe["transformEventStatus"]("cancelled");
      expect(result).toBe(CalendarEventStatus.CANCELLED);
    });

    it("should handle case insensitive status", () => {
      const result = pipe["transformEventStatus"]("CONFIRMED");
      expect(result).toBe(CalendarEventStatus.ACCEPTED);
    });

    it("should handle unknown status", () => {
      const result = pipe["transformEventStatus"]("unknown");
      expect(result).toBeNull();
    });

    it("should handle null status", () => {
      const result = pipe["transformEventStatus"](undefined);
      expect(result).toBeNull();
    });
  });

  describe("transformHosts", () => {
    it("should extract hosts from organizer attendees", () => {
      const googleEvent: GoogleCalendarEventResponse = {
        kind: "calendar#event",
        etag: "test-etag",
        id: "test-id",
        status: "confirmed",
        htmlLink: "https://example.com",
        created: "2024-01-01T00:00:00Z",
        updated: "2024-01-01T00:00:00Z",
        summary: "Test",
        creator: { email: "creator@example.com" },
        organizer: { email: "organizer@example.com" },
        start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "UTC" },
        end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "UTC" },
        iCalUID: "test-uid",
        sequence: 0,
        attendees: [
          {
            email: "attendee@example.com",
            displayName: "Regular Attendee",
            responseStatus: "accepted",
            organizer: false,
          },
          {
            email: "host1@example.com",
            displayName: "Host 1",
            responseStatus: "accepted",
            organizer: true,
          },
          {
            email: "host2@example.com",
            displayName: "Host 2",
            responseStatus: "tentative",
            organizer: true,
          },
        ],
      };

      const result = pipe["transformHosts"](googleEvent);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        email: "host1@example.com",
        name: "Host 1",
        responseStatus: CalendarEventResponseStatus.ACCEPTED,
      });
      expect(result[1]).toEqual({
        email: "host2@example.com",
        name: "Host 2",
        responseStatus: CalendarEventResponseStatus.PENDING,
      });
    });

    it("should fallback to organizer when no organizer attendees", () => {
      const googleEvent: GoogleCalendarEventResponse = {
        kind: "calendar#event",
        etag: "test-etag",
        id: "test-id",
        status: "confirmed",
        htmlLink: "https://example.com",
        created: "2024-01-01T00:00:00Z",
        updated: "2024-01-01T00:00:00Z",
        summary: "Test",
        creator: { email: "creator@example.com" },
        organizer: {
          email: "organizer@example.com",
          displayName: "Organizer Name",
        },
        start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "UTC" },
        end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "UTC" },
        iCalUID: "test-uid",
        sequence: 0,
        attendees: [
          {
            email: "attendee@example.com",
            displayName: "Regular Attendee",
            responseStatus: "accepted",
            organizer: false,
          },
        ],
      };

      const result = pipe["transformHosts"](googleEvent);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        email: "organizer@example.com",
        name: "Organizer Name",
        responseStatus: null,
      });
    });

    it("should return empty array when no organizer or organizer attendees", () => {
      const googleEvent: GoogleCalendarEventResponse = {
        kind: "calendar#event",
        etag: "test-etag",
        id: "test-id",
        status: "confirmed",
        htmlLink: "https://example.com",
        created: "2024-01-01T00:00:00Z",
        updated: "2024-01-01T00:00:00Z",
        summary: "Test",
        creator: { email: "creator@example.com" },
        organizer: { email: "organizer@example.com" },
        start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "UTC" },
        end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "UTC" },
        iCalUID: "test-uid",
        sequence: 0,
        attendees: [
          {
            email: "attendee@example.com",
            displayName: "Regular Attendee",
            responseStatus: "accepted",
            organizer: false,
          },
        ],
      };

      const result = pipe["transformHosts"](googleEvent);

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("organizer@example.com");
    });
  });

  describe("transformLocations", () => {
    it("should transform conference data entry points", () => {
      const googleEvent: GoogleCalendarEventResponse = {
        kind: "calendar#event",
        etag: "test-etag",
        id: "test-id",
        status: "confirmed",
        htmlLink: "https://example.com",
        created: "2024-01-01T00:00:00Z",
        updated: "2024-01-01T00:00:00Z",
        summary: "Test",
        creator: { email: "creator@example.com" },
        organizer: { email: "organizer@example.com" },
        start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "UTC" },
        end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "UTC" },
        iCalUID: "test-uid",
        sequence: 0,
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
      };

      const result = pipe["transformLocations"](googleEvent);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: "video",
        url: "https://meet.google.com/abc-def-ghi",
        label: "Google Meet",
        pin: "123456",
        regionCode: "US",
      });
      expect(result[1]).toEqual({
        type: "phone",
        url: "tel:+1-555-123-4567",
        label: "Phone",
        pin: "789012",
        regionCode: undefined,
      });
    });

    it("should fallback to location field", () => {
      const googleEvent: GoogleCalendarEventResponse = {
        kind: "calendar#event",
        etag: "test-etag",
        id: "test-id",
        status: "confirmed",
        htmlLink: "https://example.com",
        created: "2024-01-01T00:00:00Z",
        updated: "2024-01-01T00:00:00Z",
        summary: "Test",
        creator: { email: "creator@example.com" },
        organizer: { email: "organizer@example.com" },
        start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "UTC" },
        end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "UTC" },
        iCalUID: "test-uid",
        sequence: 0,
        location: "123 Main St, City, State",
      };

      const result = pipe["transformLocations"](googleEvent);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "video",
        url: "123 Main St, City, State",
      });
    });

    it("should fallback to hangout link", () => {
      const googleEvent: GoogleCalendarEventResponse = {
        kind: "calendar#event",
        etag: "test-etag",
        id: "test-id",
        status: "confirmed",
        htmlLink: "https://example.com",
        created: "2024-01-01T00:00:00Z",
        updated: "2024-01-01T00:00:00Z",
        summary: "Test",
        creator: { email: "creator@example.com" },
        organizer: { email: "organizer@example.com" },
        start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "UTC" },
        end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "UTC" },
        iCalUID: "test-uid",
        sequence: 0,
        hangoutLink: "https://hangouts.google.com/call/abc123",
      };

      const result = pipe["transformLocations"](googleEvent);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "video",
        url: "https://hangouts.google.com/call/abc123",
      });
    });

    it("should return empty array when no location data", () => {
      const googleEvent: GoogleCalendarEventResponse = {
        kind: "calendar#event",
        etag: "test-etag",
        id: "test-id",
        status: "confirmed",
        htmlLink: "https://example.com",
        created: "2024-01-01T00:00:00Z",
        updated: "2024-01-01T00:00:00Z",
        summary: "Test",
        creator: { email: "creator@example.com" },
        organizer: { email: "organizer@example.com" },
        start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "UTC" },
        end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "UTC" },
        iCalUID: "test-uid",
        sequence: 0,
      };

      const result = pipe["transformLocations"](googleEvent);
      expect(result).toEqual([]);
    });

    it("should prioritize conference data over location field", () => {
      const googleEvent: GoogleCalendarEventResponse = {
        kind: "calendar#event",
        etag: "test-etag",
        id: "test-id",
        status: "confirmed",
        htmlLink: "https://example.com",
        created: "2024-01-01T00:00:00Z",
        updated: "2024-01-01T00:00:00Z",
        summary: "Test",
        creator: { email: "creator@example.com" },
        organizer: { email: "organizer@example.com" },
        start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "UTC" },
        end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "UTC" },
        iCalUID: "test-uid",
        sequence: 0,
        location: "123 Main St, City, State",
        conferenceData: {
          conferenceId: "test-conference-id",
          entryPoints: [
            {
              entryPointType: "video",
              uri: "https://meet.google.com/abc-def-ghi",
            },
          ],
        },
      };

      const result = pipe["transformLocations"](googleEvent);

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe("https://meet.google.com/abc-def-ghi");
    });
  });

  describe("attendee filtering", () => {
    it("should filter out organizers from attendees list", () => {
      const googleEvent: GoogleCalendarEventResponse = {
        kind: "calendar#event",
        etag: "test-etag",
        id: "test-id",
        status: "confirmed",
        htmlLink: "https://example.com",
        created: "2024-01-01T00:00:00Z",
        updated: "2024-01-01T00:00:00Z",
        summary: "Test",
        creator: { email: "creator@example.com" },
        organizer: { email: "organizer@example.com" },
        start: { dateTime: "2024-01-15T10:00:00Z", timeZone: "UTC" },
        end: { dateTime: "2024-01-15T11:00:00Z", timeZone: "UTC" },
        iCalUID: "test-uid",
        sequence: 0,
        attendees: [
          {
            email: "attendee1@example.com",
            displayName: "Attendee 1",
            responseStatus: "accepted",
            organizer: false,
            optional: false,
          },
          {
            email: "organizer@example.com",
            displayName: "Organizer",
            responseStatus: "accepted",
            organizer: true,
            optional: false,
          },
          {
            email: "attendee2@example.com",
            displayName: "Attendee 2",
            responseStatus: "tentative",
            organizer: false,
            optional: true,
          },
        ],
      };

      const result = pipe.transform(googleEvent);

      expect(result.attendees).toHaveLength(2);
      expect(result.attendees![0].email).toBe("attendee1@example.com");
      expect(result.attendees![1].email).toBe("attendee2@example.com");
      expect(result.hosts).toHaveLength(1);
      expect(result.hosts![0].email).toBe("organizer@example.com");
    });
  });
});

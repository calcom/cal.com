import {
  CalendarEventStatus,
  CalendarEventResponseStatus,
} from "@/modules/cal-unified-calendars/outputs/get-unified-calendar-event.output";

import {
  createGoogleCalendarEventFixture,
  googleEventWithConferenceData,
  googleEventWithLocationOnly,
  googleEventWithHangoutLink,
} from "./__fixtures__/google-calendar-event.fixture";
import {
  GoogleCalendarEventOutputPipe,
  GoogleCalendarEventResponse,
} from "./get-calendar-event-details-output-pipe";

describe("GoogleCalendarEventOutputPipe", () => {
  let pipe: GoogleCalendarEventOutputPipe;
  let sharedGoogleEvent: GoogleCalendarEventResponse;

  beforeAll(() => {
    sharedGoogleEvent = createGoogleCalendarEventFixture();
  });

  beforeEach(() => {
    pipe = new GoogleCalendarEventOutputPipe();
  });

  describe("transform", () => {
    it("should transform Google Calendar event to unified format", () => {
      const result = pipe.transform(sharedGoogleEvent);

      expect(result.id).toBe("test-event-id");
      expect(result.title).toBe("Test Meeting");
      expect(result.description).toBe("Test description");
      expect(result.source).toBe("google");
      expect(result.status).toBe(CalendarEventStatus.ACCEPTED);
      expect(result.start.time).toBe("2024-01-15T10:00:00Z");
      expect(result.start.timeZone).toBe("America/New_York");
      expect(result.end.time).toBe("2024-01-15T11:00:00Z");
      expect(result.end.timeZone).toBe("America/New_York");
      expect(result.attendees).toHaveLength(2);
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

  describe("transformOrganizer", () => {
    it("should return calendarEventOwner organizer exist", () => {
      const eventWithoutOrganizerAttendees = createGoogleCalendarEventFixture({
        organizer: { email: "organizer@example.com" },
        attendees: [
          {
            email: "attendee@example.com",
            displayName: "Regular Attendee",
            responseStatus: "accepted",
            organizer: false,
          },
        ],
      });

      const result = pipe.transform(eventWithoutOrganizerAttendees);

      expect(result?.calendarEventOwner?.email).toBe("organizer@example.com");
    });
  });

  describe("transformLocations", () => {
    it("should transform conference data entry points", () => {
      const result = pipe["transformLocations"](googleEventWithConferenceData);

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
      const result = pipe["transformLocations"](googleEventWithLocationOnly);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "video",
        url: "123 Main St, City, State",
      });
    });

    it("should fallback to hangout link", () => {
      const result = pipe["transformLocations"](googleEventWithHangoutLink);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "video",
        url: "https://hangouts.google.com/call/abc123",
      });
    });

    it("should return empty array when no location data", () => {
      const eventWithoutLocation = createGoogleCalendarEventFixture({
        location: undefined,
        conferenceData: undefined,
        hangoutLink: undefined,
      });

      const result = pipe["transformLocations"](eventWithoutLocation);
      expect(result).toEqual([]);
    });
  });
});

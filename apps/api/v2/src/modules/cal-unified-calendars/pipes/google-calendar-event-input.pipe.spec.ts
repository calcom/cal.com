import {
  UpdateUnifiedCalendarEventInput,
  UpdateDateTimeWithZone,
} from "../inputs/update-unified-calendar-event.input";
import { CalendarEventResponseStatus, CalendarEventStatus } from "../outputs/get-unified-calendar-event.output";
import { GoogleCalendarEventResponse } from "./get-calendar-event-details-output-pipe";
import { GoogleCalendarEventInputPipe } from "./google-calendar-event-input-pipe";

describe("GoogleCalendarEventInputPipe", () => {
  let pipe: GoogleCalendarEventInputPipe;
  let sharedGoogleEvent: GoogleCalendarEventResponse;

  beforeAll(() => {
    sharedGoogleEvent = {
      kind: "calendar#event",
      etag: "test-etag",
      id: "test-event-id",
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event",
      created: "2024-01-01T00:00:00Z",
      updated: "2024-01-01T00:00:00Z",
      summary: "Test Meeting",
      description: "Test description",
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
          email: "attendee1@example.com",
          displayName: "Attendee One",
          responseStatus: "accepted",
          organizer: false,
        },
        {
          email: "attendee2@example.com",
          displayName: "Attendee Two",
          responseStatus: "needsAction",
          organizer: false,
        },
        {
          email: "organizer@example.com",
          displayName: "Organizer",
          responseStatus: "accepted",
          organizer: true,
        },
      ],
      creator: {
        email: "organizer@example.com",
        displayName: "Organizer",
      },
      organizer: {
        email: "organizer@example.com",
        displayName: "Organizer",
      },
    };
  });

  beforeEach(() => {
    pipe = new GoogleCalendarEventInputPipe();
  });

  describe("transform", () => {
    it("should transform basic event fields", () => {
      const input: UpdateUnifiedCalendarEventInput = {
        title: "Updated Meeting",
        description: "Updated description",
        start: {
          time: "2024-01-15T10:00:00Z",
          timeZone: "America/New_York",
        },
        end: {
          time: "2024-01-15T11:00:00Z",
          timeZone: "America/New_York",
        },
        status: CalendarEventStatus.ACCEPTED,
      };

      const expectedOutput = {
        summary: "Updated Meeting",
        description: "Updated description",
        start: {
          dateTime: "2024-01-15T10:00:00Z",
          timeZone: "America/New_York",
        },
        end: {
          dateTime: "2024-01-15T11:00:00Z",
          timeZone: "America/New_York",
        },
        status: "confirmed",
      };

      const result = pipe.transform(input);
      expect(result).toEqual(expectedOutput);
    });

    it("should handle partial updates", () => {
      const input: UpdateUnifiedCalendarEventInput = {
        title: "Only Title Update",
      };

      const expectedOutput = {
        summary: "Only Title Update",
      };

      const result = pipe.transform(input);
      expect(result).toEqual(expectedOutput);
    });

    it("should handle null description", () => {
      const input: UpdateUnifiedCalendarEventInput = {
        description: null,
      };

      const expectedOutput = {
        description: null,
      };

      const result = pipe.transform(input);
      expect(result).toEqual(expectedOutput);
    });
  });

  describe("transformDateTimeWithZone", () => {
    it("should transform date time with timezone", () => {
      const input: UpdateDateTimeWithZone = {
        time: "2024-01-15T10:00:00Z",
        timeZone: "America/New_York",
      };

      const expectedOutput = {
        dateTime: "2024-01-15T10:00:00Z",
        timeZone: "America/New_York",
      };

      const result = pipe["transformDateTimeWithZone"](input);
      expect(result).toEqual(expectedOutput);
    });

    it("should handle empty time and timezone", () => {
      const input: UpdateDateTimeWithZone = {};

      const expectedOutput = {
        dateTime: "",
        timeZone: "",
      };

      const result = pipe["transformDateTimeWithZone"](input);
      expect(result).toEqual(expectedOutput);
    });
  });

  describe("transformResponseStatus", () => {
    it("should transform ACCEPTED status", () => {
      const result = pipe["transformResponseStatus"](CalendarEventResponseStatus.ACCEPTED);
      expect(result).toBe("accepted");
    });

    it("should transform PENDING status", () => {
      const result = pipe["transformResponseStatus"](CalendarEventResponseStatus.PENDING);
      expect(result).toBe("tentative");
    });

    it("should transform DECLINED status", () => {
      const result = pipe["transformResponseStatus"](CalendarEventResponseStatus.DECLINED);
      expect(result).toBe("declined");
    });

    it("should transform NEEDS_ACTION status", () => {
      const result = pipe["transformResponseStatus"](CalendarEventResponseStatus.NEEDS_ACTION);
      expect(result).toBe("needsAction");
    });

    it("should handle null status", () => {
      const result = pipe["transformResponseStatus"](null);
      expect(result).toBe("needsAction");
    });

    it("should handle undefined status", () => {
      const result = pipe["transformResponseStatus"](undefined);
      expect(result).toBe("needsAction");
    });
  });

  describe("transformEventStatus", () => {
    it("should transform ACCEPTED status", () => {
      const result = pipe["transformEventStatus"](CalendarEventStatus.ACCEPTED);
      expect(result).toBe("confirmed");
    });

    it("should transform PENDING status", () => {
      const result = pipe["transformEventStatus"](CalendarEventStatus.PENDING);
      expect(result).toBe("tentative");
    });

    it("should transform CANCELLED status", () => {
      const result = pipe["transformEventStatus"](CalendarEventStatus.CANCELLED);
      expect(result).toBe("cancelled");
    });

    it("should transform DECLINED status", () => {
      const result = pipe["transformEventStatus"](CalendarEventStatus.DECLINED);
      expect(result).toBe("cancelled");
    });

    it("should handle null status", () => {
      const result = pipe["transformEventStatus"](null);
      expect(result).toBe("confirmed");
    });

    it("should handle undefined status", () => {
      const result = pipe["transformEventStatus"](undefined);
      expect(result).toBe("confirmed");
    });
  });
});

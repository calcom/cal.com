import {
  UpdateUnifiedCalendarEventInput,
  UpdateCalendarEventAttendee,
  UpdateCalendarEventHost,
  UpdateDateTimeWithZone,
} from "../inputs/update-unified-calendar-event.input";
import { CalendarEventResponseStatus, CalendarEventStatus } from "../outputs/get-unified-calendar-event";
import { GoogleCalendarEventResponse } from "./get-calendar-event-details-output-pipe";
import { GoogleCalendarEventInputPipe } from "./google-calendar-event-input.pipe";

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

    it("should transform attendees without existing event", () => {
      const input: UpdateUnifiedCalendarEventInput = {
        attendees: [
          {
            email: "attendee@example.com",
            name: "John Doe",
            responseStatus: CalendarEventResponseStatus.ACCEPTED,
          },
        ],
      };

      const expectedOutput = {
        attendees: [
          {
            email: "attendee@example.com",
            displayName: "John Doe",
            responseStatus: "accepted",
          },
        ],
      };

      const result = pipe.transform(input);
      expect(result).toEqual(expectedOutput);
    });

    it("should transform hosts without existing event", () => {
      const input: UpdateUnifiedCalendarEventInput = {
        hosts: [
          {
            email: "host@example.com",
            responseStatus: CalendarEventResponseStatus.ACCEPTED,
          },
        ],
      };

      const expectedOutput = {
        attendees: [
          {
            email: "host@example.com",
            displayName: "host@example.com",
            responseStatus: "accepted",
            organizer: true,
          },
        ],
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

  describe("preserveExistingAttendees", () => {
    it("should preserve existing attendees", () => {
      const result = pipe["preserveExistingAttendees"](sharedGoogleEvent);

      expect(result).toEqual([
        {
          email: "attendee1@example.com",
          displayName: "Attendee One",
          responseStatus: "accepted",
        },
        {
          email: "attendee2@example.com",
          displayName: "Attendee Two",
          responseStatus: "needsAction",
        },
        {
          email: "organizer@example.com",
          displayName: "Organizer",
          responseStatus: "accepted",
        },
      ]);
    });

    it("should return empty array when no existing event", () => {
      const result = pipe["preserveExistingAttendees"](null);
      expect(result).toEqual([]);
    });

    it("should return empty array when no attendees", () => {
      const eventWithoutAttendees = { ...sharedGoogleEvent, attendees: undefined };

      const result = pipe["preserveExistingAttendees"](eventWithoutAttendees);
      expect(result).toEqual([]);
    });
  });

  describe("processAttendeeDeletions", () => {
    it("should remove attendees marked for deletion", () => {
      const attendees = [
        {
          email: "keep@example.com",
          displayName: "Keep Me",
          responseStatus: "accepted",
          optional: false,
          organizer: false,
        },
        {
          email: "delete@example.com",
          displayName: "Delete Me",
          responseStatus: "accepted",
          optional: false,
          organizer: false,
        },
      ];

      const inputAttendees: UpdateCalendarEventAttendee[] = [
        {
          email: "delete@example.com",
          action: "delete",
        },
      ];

      const result = pipe["processAttendeeDeletions"](attendees, inputAttendees);

      expect(result).toEqual([
        {
          email: "keep@example.com",
          displayName: "Keep Me",
          responseStatus: "accepted",
          optional: false,
          organizer: false,
        },
      ]);
    });

    it("should handle case-insensitive email matching", () => {
      const attendees = [
        {
          email: "Test@Example.com",
          displayName: "Test User",
          responseStatus: "accepted",
          optional: false,
          organizer: false,
        },
      ];

      const inputAttendees: UpdateCalendarEventAttendee[] = [
        {
          email: "test@example.com",
          action: "delete",
        },
      ];

      const result = pipe["processAttendeeDeletions"](attendees, inputAttendees);
      expect(result).toEqual([]);
    });
  });

  describe("processAttendeeUpdatesAndAdditions", () => {
    it("should update existing attendee", () => {
      const attendees = [
        {
          email: "update@example.com",
          displayName: "Old Name",
          responseStatus: "needsAction",
          optional: false,
          organizer: false,
        },
      ];

      const inputAttendees: UpdateCalendarEventAttendee[] = [
        {
          email: "update@example.com",
          name: "New Name",
          responseStatus: CalendarEventResponseStatus.ACCEPTED,
        },
      ];

      const result = pipe["processAttendeeUpdatesAndAdditions"](attendees, inputAttendees);

      expect(result).toEqual([
        {
          email: "update@example.com",
          displayName: "New Name",
          responseStatus: "accepted",
          organizer: false,
        },
      ]);
    });

    it("should add new attendee", () => {
      const attendees = [
        {
          email: "existing@example.com",
          displayName: "Existing",
          responseStatus: "accepted",
          optional: false,
          organizer: false,
        },
      ];

      const inputAttendees: UpdateCalendarEventAttendee[] = [
        {
          email: "new@example.com",
          name: "New Attendee",
          responseStatus: CalendarEventResponseStatus.PENDING,
        },
      ];

      const result = pipe["processAttendeeUpdatesAndAdditions"](attendees, inputAttendees);

      expect(result).toEqual([
        {
          email: "existing@example.com",
          displayName: "Existing",
          responseStatus: "accepted",
          optional: false,
          organizer: false,
        },
        {
          email: "new@example.com",
          displayName: "New Attendee",
          responseStatus: "tentative",
        },
      ]);
    });

    it("should preserve organizer status when updating", () => {
      const attendees = [
        {
          email: "organizer@example.com",
          displayName: "Organizer",
          responseStatus: "needsAction",
          optional: false,
          organizer: true,
        },
      ];

      const inputAttendees: UpdateCalendarEventAttendee[] = [
        {
          email: "organizer@example.com",
          name: "Updated Organizer",
          responseStatus: CalendarEventResponseStatus.ACCEPTED,
        },
      ];

      const result = pipe["processAttendeeUpdatesAndAdditions"](attendees, inputAttendees);

      expect(result).toEqual([
        {
          email: "organizer@example.com",
          displayName: "Updated Organizer",
          responseStatus: "accepted",
          organizer: true,
        },
      ]);
    });
  });

  describe("replaceHostsWithUpdatedOnes", () => {
    it("should replace organizers with updated hosts", () => {
      const attendees = [
        {
          email: "attendee@example.com",
          displayName: "Regular Attendee",
          responseStatus: "accepted",
          optional: false,
          organizer: false,
        },
        {
          email: "oldhost@example.com",
          displayName: "Old Host",
          responseStatus: "needsAction",
          optional: false,
          organizer: true,
        },
      ];

      const inputHosts: UpdateCalendarEventHost[] = [
        {
          email: "newhost@example.com",
          responseStatus: CalendarEventResponseStatus.ACCEPTED,
        },
      ];

      const result = pipe["replaceHostsWithUpdatedOnes"](attendees, inputHosts);

      expect(result).toEqual([
        {
          email: "attendee@example.com",
          displayName: "Regular Attendee",
          responseStatus: "accepted",
          optional: false,
          organizer: false,
        },
        {
          email: "newhost@example.com",
          displayName: "newhost@example.com",
          responseStatus: "accepted",
          organizer: true,
        },
      ]);
    });

    it("should preserve existing host display name", () => {
      const attendees = [
        {
          email: "attendee@example.com",
          displayName: "Regular Attendee",
          responseStatus: "accepted",
          optional: false,
          organizer: false,
        },
      ];

      const inputHosts: UpdateCalendarEventHost[] = [
        {
          email: "host@example.com",
          responseStatus: CalendarEventResponseStatus.ACCEPTED,
        },
      ];

      const existingEvent: GoogleCalendarEventResponse = {
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
            email: "host@example.com",
            displayName: "Existing Host Name",
            responseStatus: "accepted",
            organizer: true,
          },
        ],
      };

      const result = pipe["replaceHostsWithUpdatedOnes"](attendees, inputHosts, existingEvent);

      expect(result).toEqual([
        {
          email: "attendee@example.com",
          displayName: "Regular Attendee",
          responseStatus: "accepted",
          optional: false,
          organizer: false,
        },
        {
          email: "host@example.com",
          displayName: "Existing Host Name",
          responseStatus: "accepted",
          organizer: true,
        },
      ]);
    });
  });

  describe("transformAttendeesWithHostsHandling", () => {
    it("should handle complex attendee and host updates", () => {
      const existingEvent: GoogleCalendarEventResponse = {
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
            email: "keep@example.com",
            displayName: "Keep Me",
            responseStatus: "accepted",
            organizer: false,
          },
          {
            email: "delete@example.com",
            displayName: "Delete Me",
            responseStatus: "accepted",
            organizer: false,
          },
          {
            email: "oldhost@example.com",
            displayName: "Old Host",
            responseStatus: "accepted",
            organizer: true,
          },
        ],
      };

      const inputAttendees: UpdateCalendarEventAttendee[] = [
        {
          email: "delete@example.com",
          action: "delete",
        },
        {
          email: "new@example.com",
          name: "New Attendee",
          responseStatus: CalendarEventResponseStatus.PENDING,
        },
      ];

      const inputHosts: UpdateCalendarEventHost[] = [
        {
          email: "newhost@example.com",
          responseStatus: CalendarEventResponseStatus.ACCEPTED,
        },
      ];

      const result = pipe["transformAttendeesWithHostsHandling"](inputAttendees, inputHosts, existingEvent);

      expect(result).toEqual([
        {
          email: "keep@example.com",
          displayName: "Keep Me",
          responseStatus: "accepted",
        },
        {
          email: "oldhost@example.com",
          displayName: "Old Host",
          responseStatus: "accepted",
        },
        {
          email: "new@example.com",
          displayName: "New Attendee",
          responseStatus: "tentative",
        },
        {
          email: "newhost@example.com",
          displayName: "newhost@example.com",
          responseStatus: "accepted",
          organizer: true,
        },
      ]);
    });
  });
});

import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import type { Person } from "@calcom/types/Calendar";

vi.mock("@calcom/features/ee/organizations/lib/getBookerUrlServer", () => ({
  getBookerBaseUrl: vi.fn(async () => "https://cal.com"),
}));

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn(async () => vi.fn(() => "translated")),
}));

vi.mock("@calcom/features/bookings/lib/getCalEventResponses", () => ({
  getCalEventResponses: vi.fn(() => ({
    responses: {
      name: { label: "your_name", value: "Test User", isHidden: false },
      email: { label: "email_address", value: "test@example.com", isHidden: false },
    },
    userFieldsResponses: {},
  })),
}));

describe("CalendarEventBuilder", () => {
  const mockTranslate = vi.fn(() => "foo") as TFunction;
  const mockStartTime = dayjs().add(1, "day").format();
  const mockEndTime = dayjs().add(1, "day").add(30, "minutes").format();

  it("should create a basic calendar event", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
        additionalNotes: "Some notes",
      })
      .withEventType({
        slug: "test-slug",
        description: "Test description",
        id: 123,
      })
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.bookerUrl).toBe("https://cal.com/user/test-slug");
      expect(event.title).toBe("Test Event");
      expect(event.startTime).toBe(mockStartTime);
      expect(event.endTime).toBe(mockEndTime);
      expect(event.additionalNotes).toBe("Some notes");
    }
  });

  it("should create an event with event type details", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        description: "Test description",
        id: 123,
        hideCalendarNotes: true,
        hideCalendarEventDetails: false,
      })
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.type).toBe("test-slug");
      expect(event.description).toBe("Test description");
      expect(event.eventTypeId).toBe(123);
      expect(event.hideCalendarNotes).toBe(true);
      expect(event.hideCalendarEventDetails).toBe(false);
    }
  });

  it("should create an event with organizer details", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        id: 123,
      })
      .withOrganizer({
        id: 456,
        name: "John Doe",
        email: "john@example.com",
        username: "johndoe",
        timeZone: "America/New_York",
        language: {
          translate: mockTranslate,
          locale: "en",
        },
      })
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.organizer).toEqual({
        id: 456,
        name: "John Doe",
        email: "john@example.com",
        username: "johndoe",
        timeZone: "America/New_York",
        language: {
          translate: mockTranslate,
          locale: "en",
        },
      });
    }
  });

  it("should handle nameless organizer", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        id: 123,
      })
      .withOrganizer({
        id: 456,
        name: null,
        email: "john@example.com",
        timeZone: "America/New_York",
        language: {
          translate: mockTranslate,
          locale: "en",
        },
      })
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.organizer.name).toBe("Nameless");
    }
  });

  it("should create an event with attendees", () => {
    const attendees: Person[] = [
      {
        email: "attendee1@example.com",
        name: "Attendee One",
        timeZone: "Europe/London",
        language: {
          translate: mockTranslate,
          locale: "en",
        },
      },
      {
        email: "attendee2@example.com",
        name: "Attendee Two",
        timeZone: "Europe/Paris",
        language: {
          translate: mockTranslate,
          locale: "fr",
        },
      },
    ];

    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        id: 123,
      })
      .withAttendees(attendees)
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.attendees).toEqual(attendees);
    }
  });

  it("should create an event with metadata and responses", () => {
    const customInputs = { question1: "answer1" };
    const responses = {
      name: { label: "your_name", value: "Owner 1", isHidden: false },
      email: {
        label: "email_address",
        value: "owner1-dunder@example.com",
        isHidden: false,
      },
    };
    const userFieldsResponses = {};

    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        id: 123,
      })
      .withMetadataAndResponses({
        additionalNotes: "Some notes",
        customInputs,
        responses,
        userFieldsResponses,
      })
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.additionalNotes).toBe("Some notes");
      expect(event.customInputs).toEqual(customInputs);
      expect(event.responses).toEqual(responses);
      expect(event.userFieldsResponses).toEqual(userFieldsResponses);
    }
  });

  it("should create an event with location", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        id: 123,
      })
      .withLocation({
        location: "Conference Room A",
        conferenceCredentialId: 789,
      })
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.location).toBe("Conference Room A");
      expect(event.conferenceCredentialId).toBe(789);
    }
  });

  it("should create an event with destination calendar", () => {
    const destinationCalendar = {
      id: 1,
      integration: "google_calendar",
      externalId: "external123",
      primaryEmail: "primary@example.com",
      userId: null,
      eventTypeId: null,
      credentialId: null,
      createdAt: null,
      updatedAt: null,
      delegationCredentialId: null,
      domainWideDelegationCredentialId: null,
    };

    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        id: 123,
      })
      .withDestinationCalendar([destinationCalendar])
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.destinationCalendar).toEqual([destinationCalendar]);
    }
  });

  it("should create an event with identifiers", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        id: 123,
      })
      .withIdentifiers({
        iCalUID: "ical-123",
        iCalSequence: 2,
      })
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.iCalUID).toBe("ical-123");
      expect(event.iCalSequence).toBe(2);
    }
  });

  it("should create an event with confirmation settings", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        id: 123,
      })
      .withConfirmation({
        requiresConfirmation: true,
        isConfirmedByDefault: false,
      })
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.requiresConfirmation).toBe(true);
      expect(event.oneTimePassword).toBeUndefined();
    }
  });

  it("should set oneTimePassword to null when isConfirmedByDefault is true", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        id: 123,
      })
      .withConfirmation({
        requiresConfirmation: true,
        isConfirmedByDefault: true,
      })
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.requiresConfirmation).toBe(true);
      expect(event.oneTimePassword).toBeNull();
    }
  });

  it("should create an event with platform variables", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        id: 123,
      })
      .withPlatformVariables({
        platformClientId: "client-123",
        platformRescheduleUrl: "https://platform.com/reschedule",
        platformCancelUrl: "https://platform.com/cancel",
        platformBookingUrl: "https://platform.com/booking",
      })
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.platformClientId).toBe("client-123");
      expect(event.platformRescheduleUrl).toBe("https://platform.com/reschedule");
      expect(event.platformCancelUrl).toBe("https://platform.com/cancel");
      expect(event.platformBookingUrl).toBe("https://platform.com/booking");
    }
  });

  it("should create an event with apps status", () => {
    const appsStatus = [
      {
        appName: "google-calendar",
        type: "google_calendar",
        success: 1,
        failures: 0,
        errors: [],
        warnings: [],
      },
      {
        appName: "Google Meet",
        type: "conferencing",
        success: 1,
        failures: 0,
        errors: [],
        warnings: undefined,
      },
    ];

    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        id: 123,
      })
      .withAppsStatus(appsStatus)
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.appsStatus).toEqual(appsStatus);
    }
  });

  it("should create an event with video call data", () => {
    const videoCallData = {
      type: "google_meet",
      id: "123",
      url: "https://meet.example.com/123",
      password: "password123",
    };

    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        id: 123,
      })
      .withVideoCallData(videoCallData)
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.videoCallData).toEqual(videoCallData);
    }
  });

  it("should create an event with team information", () => {
    const team = {
      name: "Engineering Team",
      members: [
        {
          email: "member1@example.com",
          name: "Member One",
          timeZone: "America/Chicago",
          language: {
            translate: mockTranslate,
            locale: "en",
          },
        },
      ],
      id: 101,
    };

    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        id: 123,
      })
      .withTeam(team)
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.team).toEqual(team);
    }
  });

  it("should create an event with recurring event information", () => {
    const recurringEvent = {
      count: 5,
      freq: 2,
      interval: 1,
    };

    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        id: 123,
      })
      .withRecurring(recurringEvent)
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.recurringEvent).toEqual(recurringEvent);
    }
  });

  it("should create an event with attendee seat ID", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        id: 123,
      })
      .withAttendeeSeatId("seat-123")
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.attendeeSeatId).toBe("seat-123");
    }
  });

  it("should create an event with UID", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        id: 123,
      })
      .withUid("booking-uid-123")
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.uid).toBe("booking-uid-123");
    }
  });

  it("should create an event with one-time password", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        id: 123,
      })
      .withOneTimePassword("otp123")
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.oneTimePassword).toBe("otp123");
    }
  });

  it("should create an event with recurring event ID", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withEventType({
        slug: "test-slug",
        id: 123,
      })
      .withRecurringEventId("recurring-123")
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.existingRecurringEvent).toEqual({
        recurringEventId: "recurring-123",
      });
    }
  });

  it("should create a complete calendar event with all properties", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Complete Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
        additionalNotes: "Complete test notes",
      })
      .withEventType({
        slug: "complete-test",
        description: "Complete test description",
        id: 123,
        hideCalendarNotes: true,
        hideCalendarEventDetails: false,
      })
      .withOrganizer({
        id: 456,
        name: "John Doe",
        email: "john@example.com",
        username: "johndoe",
        timeZone: "America/New_York",
        language: {
          translate: mockTranslate,
          locale: "en",
        },
      })
      .withAttendees([
        {
          email: "attendee@example.com",
          name: "Attendee",
          timeZone: "Europe/London",
          language: {
            translate: mockTranslate,
            locale: "en",
          },
        },
      ])
      .withMetadataAndResponses({
        customInputs: { question1: "answer1" },
        responses: {
          name: { label: "your_name", value: "Owner 1", isHidden: false },
          email: {
            label: "email_address",
            value: "owner1-dunder@example.com",
            isHidden: false,
          },
        },
      })
      .withLocation({
        location: "Conference Room A",
      })
      .withDestinationCalendar([
        {
          id: 1,
          integration: "google_calendar",
          externalId: "external123",
          primaryEmail: "primary@example.com",
          userId: 1,
          eventTypeId: 123,
          credentialId: 1,
          createdAt: null,
          updatedAt: null,
          delegationCredentialId: null,
          domainWideDelegationCredentialId: null,
        },
      ])
      .withIdentifiers({
        iCalUID: "ical-123",
        iCalSequence: 2,
      })
      .withConfirmation({
        requiresConfirmation: true,
        isConfirmedByDefault: false,
      })
      .withPlatformVariables({
        platformClientId: "client-123",
      })
      .withAppsStatus([
        {
          appName: "google-calendar",
          type: "google_calendar",
          success: 1,
          failures: 0,
          errors: [],
          warnings: [],
        },
      ])
      .withVideoCallData({
        type: "google_meet",
        id: "123",
        url: "https://meet.example.com/123",
        password: "password123",
      })
      .withTeam({
        name: "Engineering Team",
        members: [],
        id: 101,
      })
      .withRecurring({
        count: 5,
        freq: 2,
        interval: 1,
      })
      .withAttendeeSeatId("seat-123")
      .withUid("booking-uid-123")
      .withOneTimePassword("otp123")
      .build();

    // Test that all properties are set correctly
    expect(event).not.toBeNull();
    if (event) {
      expect(event.title).toBe("Complete Test Event");
      expect(event.type).toBe("complete-test");
      expect(event.organizer.name).toBe("John Doe");
      expect(event.attendees).toHaveLength(1);
      expect(event.location).toBe("Conference Room A");
      expect(event.iCalUID).toBe("ical-123");
      expect(event.requiresConfirmation).toBe(true);
      expect(event.platformClientId).toBe("client-123");
      expect(event.appsStatus).toHaveLength(1);
      expect(event.videoCallData?.url).toBe("https://meet.example.com/123");
      expect(event.team?.name).toBe("Engineering Team");
      expect(event.recurringEvent?.count).toBe(5);
      expect(event.attendeeSeatId).toBe("seat-123");
      expect(event.uid).toBe("booking-uid-123");
      expect(event.oneTimePassword).toBe("otp123");
    }
  });

  it("should return null when building without required fields", () => {
    const builder = new CalendarEventBuilder();
    expect(builder.build()).toBeNull();
  });

  it("should create an event from an existing event", () => {
    const existingEvent = {
      title: "Existing Event",
      startTime: mockStartTime,
      endTime: mockEndTime,
      type: "existing-type",
      bookerUrl: "https://cal.com/user/test-slug",
    };

    const event = CalendarEventBuilder.fromEvent(existingEvent)
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Updated Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.title).toBe("Updated Event");
      expect(event.type).toBe("existing-type");
    }
  });

  it("should propagate disableCancelling and disableRescheduling", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user/test-slug",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
        additionalNotes: "Some notes",
      })
      .withEventType({
        slug: "test-slug",
        description: "Test description",
        id: 123,
        disableCancelling: true,
        disableRescheduling: true,
      })
      .build();

    expect(event).not.toBeNull();
    if (event) {
      expect(event.disableCancelling).toBe(true);
      expect(event.disableRescheduling).toBe(true);
    }
  });

  describe("fromBooking", () => {
    it("should create a calendar event from a basic booking", async () => {
      const mockBooking = {
        uid: "booking-123",
        title: "Test Booking",
        startTime: new Date(mockStartTime),
        endTime: new Date(mockEndTime),
        description: "Test booking description",
        location: "Conference Room A",
        responses: {
          name: { label: "your_name", value: "John Doe" },
          email: { label: "email_address", value: "john@example.com" },
        },
        customInputs: null,
        iCalUID: "ical-uid-123",
        iCalSequence: 1,
        oneTimePassword: null,
        attendees: [
          {
            name: "Attendee One",
            email: "attendee1@example.com",
            timeZone: "America/New_York",
            locale: "en",
            phoneNumber: null,
          },
        ],
        user: {
          id: 1,
          name: "Organizer Name",
          email: "organizer@example.com",
          username: "organizer",
          timeZone: "America/Los_Angeles",
          locale: "en",
          timeFormat: 12,
          destinationCalendar: null,
          profiles: [],
        },
        destinationCalendar: null,
        eventType: {
          id: 100,
          slug: "test-event",
          description: "Test event description",
          hideCalendarNotes: false,
          hideCalendarEventDetails: false,
          hideOrganizerEmail: false,
          schedulingType: null,
          seatsPerTimeSlot: null,
          seatsShowAttendees: false,
          seatsShowAvailabilityCount: false,
          customReplyToEmail: null,
          disableRescheduling: false,
          disableCancelling: false,
          requiresConfirmation: false,
          recurringEvent: null,
          bookingFields: [],
          metadata: null,
          eventName: null,
          team: null,
          users: [],
          hosts: [],
          workflows: [],
        },
        references: [],
        seatsReferences: [],
      };

      const eventFromBooking = await CalendarEventBuilder.fromBooking(mockBooking);
      const builtEvent = eventFromBooking.build();

      expect(builtEvent).not.toBeNull();
      if (builtEvent) {
        expect(builtEvent.uid).toBe("booking-123");
        expect(builtEvent.title).toBe("Test Booking");
        expect(builtEvent.startTime).toBe(new Date(mockStartTime).toISOString());
        expect(builtEvent.endTime).toBe(new Date(mockEndTime).toISOString());
        expect(builtEvent.additionalNotes).toBe("Test booking description");
        expect(builtEvent.location).toBe("Conference Room A");
        expect(builtEvent.type).toBe("test-event");
        expect(builtEvent.eventTypeId).toBe(100);
        expect(builtEvent.organizer.name).toBe("Organizer Name");
        expect(builtEvent.organizer.email).toBe("organizer@example.com");
        expect(builtEvent.attendees).toHaveLength(1);
        expect(builtEvent.attendees[0].email).toBe("attendee1@example.com");
        expect(builtEvent.iCalUID).toBe("ical-uid-123");
        expect(builtEvent.iCalSequence).toBe(1);
      }
    });

    it("should create a calendar event from booking with video call data", async () => {
      const mockBooking = {
        uid: "booking-456",
        title: "Video Meeting",
        startTime: new Date(mockStartTime),
        endTime: new Date(mockEndTime),
        description: null,
        location: "integrations:zoom",
        responses: null,
        customInputs: null,
        iCalUID: null,
        iCalSequence: 0,
        oneTimePassword: null,
        attendees: [
          {
            name: "Attendee Two",
            email: "attendee2@example.com",
            timeZone: "Europe/London",
            locale: "en",
            phoneNumber: null,
          },
        ],
        user: {
          id: 2,
          name: "Host Name",
          email: "host@example.com",
          username: "host",
          timeZone: "UTC",
          locale: "en",
          timeFormat: 24,
          destinationCalendar: null,
          profiles: [],
        },
        destinationCalendar: null,
        eventType: {
          id: 200,
          slug: "video-call",
          description: "Video call event",
          hideCalendarNotes: false,
          hideCalendarEventDetails: false,
          hideOrganizerEmail: false,
          schedulingType: null,
          seatsPerTimeSlot: null,
          seatsShowAttendees: false,
          seatsShowAvailabilityCount: false,
          customReplyToEmail: null,
          disableRescheduling: false,
          disableCancelling: false,
          requiresConfirmation: false,
          recurringEvent: null,
          bookingFields: [],
          metadata: null,
          eventName: null,
          team: null,
          users: [],
          hosts: [],
          workflows: [],
        },
        references: [
          {
            type: "zoom_video",
            meetingId: "zoom-123",
            meetingPassword: "password123",
            meetingUrl: "https://zoom.us/j/123",
          },
        ],
        seatsReferences: [],
      };

      const eventFromBooking = await CalendarEventBuilder.fromBooking(mockBooking);
      const builtEvent = eventFromBooking.build();

      expect(builtEvent).not.toBeNull();
      if (builtEvent) {
        expect(builtEvent.videoCallData).toBeDefined();
        expect(builtEvent.videoCallData?.type).toBe("zoom_video");
        expect(builtEvent.videoCallData?.id).toBe("zoom-123");
        expect(builtEvent.videoCallData?.password).toBe("password123");
        expect(builtEvent.videoCallData?.url).toBe("https://zoom.us/j/123");
        expect(builtEvent.appsStatus).toHaveLength(1);
        expect(builtEvent.appsStatus?.[0].type).toBe("zoom_video");
      }
    });

    it("should create a calendar event from booking with team", async () => {
      const mockBooking = {
        uid: "booking-789",
        title: "Team Meeting",
        startTime: new Date(mockStartTime),
        endTime: new Date(mockEndTime),
        description: "Team event description",
        location: "Office",
        responses: null,
        customInputs: null,
        iCalUID: null,
        iCalSequence: 0,
        oneTimePassword: null,
        attendees: [
          {
            name: "Client",
            email: "client@example.com",
            timeZone: "America/Chicago",
            locale: "en",
            phoneNumber: null,
          },
        ],
        user: {
          id: 3,
          name: "Team Lead",
          email: "lead@example.com",
          username: "lead",
          timeZone: "America/New_York",
          locale: "en",
          timeFormat: 12,
          destinationCalendar: {
            id: 1,
            integration: "google_calendar",
            externalId: "external-1",
            primaryEmail: "lead@example.com",
            userId: 3,
            eventTypeId: null,
            credentialId: 1,
            createdAt: null,
            updatedAt: null,
            delegationCredentialId: null,
            domainWideDelegationCredentialId: null,
          },
          profiles: [],
        },
        destinationCalendar: null,
        eventType: {
          id: 300,
          slug: "team-event",
          description: "Team event",
          hideCalendarNotes: false,
          hideCalendarEventDetails: false,
          hideOrganizerEmail: false,
          schedulingType: "COLLECTIVE",
          seatsPerTimeSlot: null,
          seatsShowAttendees: false,
          seatsShowAvailabilityCount: false,
          customReplyToEmail: null,
          disableRescheduling: false,
          disableCancelling: false,
          requiresConfirmation: false,
          recurringEvent: null,
          bookingFields: [],
          metadata: null,
          eventName: null,
          team: {
            id: 10,
            name: "Engineering Team",
            parentId: null,
            members: [],
          },
          users: [],
          hosts: [
            {
              userId: 3,
              isFixed: true,
              user: {
                id: 3,
                name: "Team Lead",
                email: "lead@example.com",
                username: "lead",
                timeZone: "America/New_York",
                locale: "en",
                timeFormat: 12,
                destinationCalendar: {
                  id: 1,
                  integration: "google_calendar",
                  externalId: "external-1",
                  primaryEmail: "lead@example.com",
                  userId: 3,
                  eventTypeId: null,
                  credentialId: 1,
                  createdAt: null,
                  updatedAt: null,
                  delegationCredentialId: null,
                  domainWideDelegationCredentialId: null,
                },
              },
            },
            {
              userId: 4,
              isFixed: false,
              user: {
                id: 4,
                name: "Team Member",
                email: "member@example.com",
                username: "member",
                timeZone: "America/Los_Angeles",
                locale: "en",
                timeFormat: 24,
                destinationCalendar: {
                  id: 2,
                  integration: "google_calendar",
                  externalId: "external-2",
                  primaryEmail: "member@example.com",
                  userId: 4,
                  eventTypeId: null,
                  credentialId: 2,
                  createdAt: null,
                  updatedAt: null,
                  delegationCredentialId: null,
                  domainWideDelegationCredentialId: null,
                },
              },
            },
          ],
          workflows: [],
        },
        references: [],
        seatsReferences: [],
      };

      const eventFromBooking = await CalendarEventBuilder.fromBooking(mockBooking);
      const builtEvent = eventFromBooking.build();

      expect(builtEvent).not.toBeNull();
      if (builtEvent) {
        expect(builtEvent.team).toBeDefined();
        expect(builtEvent.team?.id).toBe(10);
        expect(builtEvent.team?.name).toBe("Engineering Team");
        expect(builtEvent.team?.members).toHaveLength(1); // Excludes organizer
        expect(builtEvent.team?.members[0].email).toBe("member@example.com");
        expect(builtEvent.destinationCalendar).toHaveLength(3); // 2 hosts + 1 user calendar
        expect(builtEvent.schedulingType).toBe("COLLECTIVE");
      }
    });

    it("should create a calendar event from booking with recurring event", async () => {
      const mockBooking = {
        uid: "booking-recurring",
        title: "Recurring Meeting",
        startTime: new Date(mockStartTime),
        endTime: new Date(mockEndTime),
        description: null,
        location: "Zoom",
        responses: null,
        customInputs: null,
        iCalUID: null,
        iCalSequence: 0,
        oneTimePassword: null,
        attendees: [
          {
            name: "Regular Attendee",
            email: "regular@example.com",
            timeZone: "America/New_York",
            locale: "en",
            phoneNumber: null,
          },
        ],
        user: {
          id: 5,
          name: "Recurring Host",
          email: "recurring@example.com",
          username: "recurring",
          timeZone: "America/New_York",
          locale: "en",
          timeFormat: 12,
          destinationCalendar: null,
          profiles: [],
        },
        destinationCalendar: null,
        eventType: {
          id: 400,
          slug: "recurring-event",
          description: "Recurring event",
          hideCalendarNotes: false,
          hideCalendarEventDetails: false,
          hideOrganizerEmail: false,
          schedulingType: null,
          seatsPerTimeSlot: null,
          seatsShowAttendees: false,
          seatsShowAvailabilityCount: false,
          customReplyToEmail: null,
          disableRescheduling: false,
          disableCancelling: false,
          requiresConfirmation: false,
          recurringEvent: { freq: 2, count: 5, interval: 1 },
          bookingFields: [],
          metadata: null,
          eventName: null,
          team: null,
          users: [],
          hosts: [],
          workflows: [],
        },
        references: [],
        seatsReferences: [],
      };

      const eventFromBooking = await CalendarEventBuilder.fromBooking(mockBooking);
      const builtEvent = eventFromBooking.build();

      expect(builtEvent).not.toBeNull();
      if (builtEvent) {
        expect(builtEvent.recurringEvent).toBeDefined();
        expect(builtEvent.recurringEvent?.freq).toBe(2);
        expect(builtEvent.recurringEvent?.count).toBe(5);
        expect(builtEvent.recurringEvent?.interval).toBe(1);
      }
    });

    it("should create a calendar event from booking with seats", async () => {
      const mockBooking = {
        uid: "booking-seats",
        title: "Webinar",
        startTime: new Date(mockStartTime),
        endTime: new Date(mockEndTime),
        description: "Webinar description",
        location: "Online",
        responses: {
          email: "seat@example.com",
          name: "Seat Holder",
        },
        customInputs: null,
        iCalUID: null,
        iCalSequence: 0,
        oneTimePassword: null,
        attendees: [
          {
            name: "Seat Holder",
            email: "seat@example.com",
            timeZone: "America/New_York",
            locale: "en",
            phoneNumber: null,
          },
        ],
        user: {
          id: 6,
          name: "Webinar Host",
          email: "webinar@example.com",
          username: "webinar",
          timeZone: "America/New_York",
          locale: "en",
          timeFormat: 12,
          destinationCalendar: null,
          profiles: [],
        },
        destinationCalendar: null,
        eventType: {
          id: 500,
          slug: "webinar",
          description: "Webinar event",
          hideCalendarNotes: false,
          hideCalendarEventDetails: false,
          hideOrganizerEmail: false,
          schedulingType: null,
          seatsPerTimeSlot: 10,
          seatsShowAttendees: true,
          seatsShowAvailabilityCount: true,
          customReplyToEmail: null,
          disableRescheduling: false,
          disableCancelling: false,
          requiresConfirmation: false,
          recurringEvent: null,
          bookingFields: [],
          metadata: null,
          eventName: null,
          team: null,
          users: [],
          hosts: [],
          workflows: [],
        },
        references: [],
        seatsReferences: [
          {
            id: 1,
            referenceUid: "seat-ref-123",
            attendee: {
              id: 1,
              email: "seat@example.com",
              phoneNumber: null,
            },
          },
        ],
      };

      const eventFromBooking = await CalendarEventBuilder.fromBooking(mockBooking);
      const builtEvent = eventFromBooking.build();

      expect(builtEvent).not.toBeNull();
      if (builtEvent) {
        expect(builtEvent.seatsPerTimeSlot).toBe(10);
        expect(builtEvent.seatsShowAttendees).toBe(true);
        expect(builtEvent.seatsShowAvailabilityCount).toBe(true);
        expect(builtEvent.attendeeSeatId).toBe("seat-ref-123");
      }
    });

    it("should create a calendar event from booking with custom inputs and responses", async () => {
      const mockBooking = {
        uid: "booking-custom",
        title: "Custom Event",
        startTime: new Date(mockStartTime),
        endTime: new Date(mockEndTime),
        description: "Event with custom fields",
        location: "TBD",
        responses: {
          name: { label: "your_name", value: "Custom User" },
          email: { label: "email_address", value: "custom@example.com" },
          customField: { label: "Custom Question", value: "Custom Answer" },
        },
        customInputs: { oldField: "oldValue" },
        iCalUID: "custom-ical",
        iCalSequence: 2,
        oneTimePassword: "otp-456",
        attendees: [
          {
            name: "Custom User",
            email: "custom@example.com",
            timeZone: "Europe/Paris",
            locale: "fr",
            phoneNumber: "+33123456789",
          },
        ],
        user: {
          id: 7,
          name: "Custom Host",
          email: "customhost@example.com",
          username: "customhost",
          timeZone: "Europe/Paris",
          locale: "fr",
          timeFormat: 24,
          destinationCalendar: null,
          profiles: [],
        },
        destinationCalendar: null,
        eventType: {
          id: 600,
          slug: "custom-event",
          description: "Custom event type",
          hideCalendarNotes: true,
          hideCalendarEventDetails: true,
          hideOrganizerEmail: true,
          schedulingType: null,
          seatsPerTimeSlot: null,
          seatsShowAttendees: false,
          seatsShowAvailabilityCount: false,
          customReplyToEmail: "custom-reply@example.com",
          disableRescheduling: true,
          disableCancelling: true,
          requiresConfirmation: true,
          recurringEvent: null,
          bookingFields: [
            {
              name: "customField",
              type: "text",
              label: "Custom Question",
              required: true,
            },
          ],
          metadata: null,
          eventName: null,
          team: null,
          users: [],
          hosts: [],
          workflows: [],
        },
        references: [],
        seatsReferences: [],
      };

      const eventFromBooking = await CalendarEventBuilder.fromBooking(mockBooking);
      const builtEvent = eventFromBooking.build();

      expect(builtEvent).not.toBeNull();
      if (builtEvent) {
        expect(builtEvent.hideCalendarNotes).toBe(true);
        expect(builtEvent.hideCalendarEventDetails).toBe(true);
        expect(builtEvent.hideOrganizerEmail).toBe(true);
        expect(builtEvent.customReplyToEmail).toBe("custom-reply@example.com");
        expect(builtEvent.disableRescheduling).toBe(true);
        expect(builtEvent.disableCancelling).toBe(true);
        expect(builtEvent.requiresConfirmation).toBe(true);
        expect(builtEvent.oneTimePassword).toBe("otp-456");
        expect(builtEvent.customInputs).toEqual({ oldField: "oldValue" });
        expect(builtEvent.responses).toBeDefined();
      }
    });

    it("should match calendar event built from booking with manually built event", async () => {
      const mockBooking = {
        uid: "booking-match",
        title: "Match Test",
        startTime: new Date(mockStartTime),
        endTime: new Date(mockEndTime),
        description: "Match test description",
        location: "Test Location",
        responses: {
          name: { label: "your_name", value: "Match User" },
          email: { label: "email_address", value: "match@example.com" },
        },
        customInputs: null,
        iCalUID: "match-ical",
        iCalSequence: 1,
        oneTimePassword: null,
        attendees: [
          {
            name: "Match User",
            email: "match@example.com",
            timeZone: "America/New_York",
            locale: "en",
            phoneNumber: null,
          },
        ],
        user: {
          id: 8,
          name: "Match Host",
          email: "matchhost@example.com",
          username: "matchhost",
          timeZone: "America/New_York",
          locale: "en",
          timeFormat: 12,
          destinationCalendar: null,
          profiles: [],
        },
        destinationCalendar: null,
        eventType: {
          id: 700,
          slug: "match-event",
          description: "Match event type",
          hideCalendarNotes: false,
          hideCalendarEventDetails: false,
          hideOrganizerEmail: false,
          schedulingType: null,
          seatsPerTimeSlot: null,
          seatsShowAttendees: false,
          seatsShowAvailabilityCount: false,
          customReplyToEmail: null,
          disableRescheduling: false,
          disableCancelling: false,
          requiresConfirmation: false,
          recurringEvent: null,
          bookingFields: [],
          metadata: null,
          eventName: null,
          team: null,
          users: [],
          hosts: [],
          workflows: [],
        },
        references: [],
        seatsReferences: [],
      };

      const eventFromBooking = await CalendarEventBuilder.fromBooking(mockBooking);
      const builtFromBooking = eventFromBooking.build();

      const manualBuilder = new CalendarEventBuilder();
      const organizerPerson = {
        id: 8,
        name: "Match Host",
        email: "matchhost@example.com",
        username: "matchhost",
        timeZone: "America/New_York",
        language: { translate: mockTranslate, locale: "en" },
        timeFormat: "h:mma" as const,
      };
      const attendeePerson = {
        name: "Match User",
        email: "match@example.com",
        timeZone: "America/New_York",
        language: { translate: mockTranslate, locale: "en" },
      };

      const manualEvent = manualBuilder
        .withBasicDetails({
          bookerUrl: "https://cal.com",
          title: "Match Test",
          startTime: new Date(mockStartTime).toISOString(),
          endTime: new Date(mockEndTime).toISOString(),
          additionalNotes: "Match test description",
        })
        .withEventType({
          id: 700,
          slug: "match-event",
          description: "Match event type",
          hideCalendarNotes: false,
          hideCalendarEventDetails: false,
          hideOrganizerEmail: false,
          schedulingType: null,
          seatsPerTimeSlot: null,
          seatsShowAttendees: false,
          seatsShowAvailabilityCount: false,
          customReplyToEmail: null,
          disableRescheduling: false,
          disableCancelling: false,
        })
        .withOrganizer(organizerPerson)
        .withAttendees([attendeePerson])
        .withLocation({ location: "Test Location" })
        .withIdentifiers({ iCalUID: "match-ical", iCalSequence: 1 })
        .withConfirmation({ requiresConfirmation: false, isConfirmedByDefault: true })
        .withUid("booking-match")
        .withAppsStatus([])
        .build();

      expect(builtFromBooking).not.toBeNull();
      expect(manualEvent).not.toBeNull();

      if (builtFromBooking && manualEvent) {
        expect(builtFromBooking.uid).toBe(manualEvent.uid);
        expect(builtFromBooking.title).toBe(manualEvent.title);
        expect(builtFromBooking.startTime).toBe(manualEvent.startTime);
        expect(builtFromBooking.endTime).toBe(manualEvent.endTime);
        expect(builtFromBooking.type).toBe(manualEvent.type);
        expect(builtFromBooking.eventTypeId).toBe(manualEvent.eventTypeId);
        expect(builtFromBooking.location).toBe(manualEvent.location);
        expect(builtFromBooking.organizer.email).toBe(manualEvent.organizer.email);
        expect(builtFromBooking.attendees[0].email).toBe(manualEvent.attendees[0].email);
        expect(builtFromBooking.iCalUID).toBe(manualEvent.iCalUID);
        expect(builtFromBooking.iCalSequence).toBe(manualEvent.iCalSequence);
      }
    });

    it("should throw error when booking is missing user", async () => {
      const mockBooking = {
        uid: "booking-no-user",
        title: "No User",
        startTime: new Date(mockStartTime),
        endTime: new Date(mockEndTime),
        description: null,
        location: null,
        responses: null,
        customInputs: null,
        iCalUID: null,
        iCalSequence: 0,
        oneTimePassword: null,
        attendees: [],
        user: null,
        destinationCalendar: null,
        eventType: {
          id: 800,
          slug: "test",
          description: null,
          hideCalendarNotes: false,
          hideCalendarEventDetails: false,
          hideOrganizerEmail: false,
          schedulingType: null,
          seatsPerTimeSlot: null,
          seatsShowAttendees: false,
          seatsShowAvailabilityCount: false,
          customReplyToEmail: null,
          disableRescheduling: false,
          disableCancelling: false,
          requiresConfirmation: false,
          recurringEvent: null,
          bookingFields: [],
          metadata: null,
          eventName: null,
          team: null,
          users: [],
          hosts: [],
          workflows: [],
        },
        references: [],
        seatsReferences: [],
      };

      await expect(CalendarEventBuilder.fromBooking(mockBooking)).rejects.toThrow(
        "Booking booking-no-user is missing an organizer"
      );
    });

    it("should throw error when booking is missing eventType", async () => {
      const mockBooking = {
        uid: "booking-no-eventtype",
        title: "No EventType",
        startTime: new Date(mockStartTime),
        endTime: new Date(mockEndTime),
        description: null,
        location: null,
        responses: null,
        customInputs: null,
        iCalUID: null,
        iCalSequence: 0,
        oneTimePassword: null,
        attendees: [],
        user: {
          id: 9,
          name: "User",
          email: "user@example.com",
          username: "user",
          timeZone: "UTC",
          locale: "en",
          timeFormat: 12,
          destinationCalendar: null,
          profiles: [],
        },
        destinationCalendar: null,
        eventType: null,
        references: [],
        seatsReferences: [],
      };

      await expect(CalendarEventBuilder.fromBooking(mockBooking)).rejects.toThrow(
        "Booking booking-no-eventtype is missing eventType"
      );
    });

    it("should create a complete calendar event with all properties using a booking", async () => {
      const startTime = new Date("2025-01-01T10:00:00.000Z");
      const endTime = new Date("2025-01-01T10:30:00.000Z");

      const mockBooking = {
        uid: "complete-booking-uid",
        title: "Complete Team Event",
        startTime,
        endTime,
        description: "Complete event description with all properties",
        location: "Conference Room A",
        responses: {
          email: "complete@example.com",
          name: "Complete User",
          attendeePhoneNumber: "+1234567890",
        },
        customInputs: { oldCustomField: "oldValue" },
        iCalUID: "complete-ical-uid",
        iCalSequence: 3,
        oneTimePassword: "otp-complete",
        attendees: [
          {
            name: "Complete User",
            email: "complete@example.com",
            timeZone: "America/New_York",
            locale: "en",
            phoneNumber: "+1234567890",
          },
          {
            name: "Guest User",
            email: "guest@example.com",
            timeZone: "Europe/London",
            locale: "en",
            phoneNumber: null,
          },
        ],
        user: {
          id: 100,
          name: "Team Lead",
          email: "lead@example.com",
          username: "teamlead",
          timeZone: "America/New_York",
          locale: "en",
          timeFormat: 12,
          destinationCalendar: {
            id: 10,
            integration: "google_calendar",
            externalId: "lead-calendar-id",
            primaryEmail: "lead@example.com",
            userId: 100,
            eventTypeId: null,
            credentialId: 10,
            createdAt: null,
            updatedAt: null,
            delegationCredentialId: null,
            domainWideDelegationCredentialId: null,
          },
          profiles: [{ organizationId: 1 }],
        },
        destinationCalendar: null,
        eventType: {
          id: 1000,
          slug: "complete-event",
          description: "Complete event type description",
          hideCalendarNotes: true,
          hideCalendarEventDetails: true,
          hideOrganizerEmail: true,
          schedulingType: "COLLECTIVE",
          seatsPerTimeSlot: 20,
          seatsShowAttendees: true,
          seatsShowAvailabilityCount: true,
          customReplyToEmail: "custom-reply@example.com",
          disableRescheduling: true,
          disableCancelling: true,
          requiresConfirmation: true,
          recurringEvent: { freq: 2, count: 10, interval: 1 },
          bookingFields: [
            {
              name: "customQuestion",
              type: "text",
              label: "Custom Question",
              required: true,
            },
          ],
          metadata: null,
          eventName: null,
          team: {
            id: 50,
            name: "Engineering Team",
            parentId: 1,
            members: [],
          },
          users: [],
          hosts: [
            {
              userId: 100,
              isFixed: true,
              user: {
                id: 100,
                name: "Team Lead",
                email: "lead@example.com",
                username: "teamlead",
                timeZone: "America/New_York",
                locale: "en",
                timeFormat: 12,
                destinationCalendar: {
                  id: 10,
                  integration: "google_calendar",
                  externalId: "lead-calendar-id",
                  primaryEmail: "lead@example.com",
                  userId: 100,
                  eventTypeId: null,
                  credentialId: 10,
                  createdAt: null,
                  updatedAt: null,
                  delegationCredentialId: null,
                  domainWideDelegationCredentialId: null,
                },
              },
            },
            {
              userId: 101,
              isFixed: false,
              user: {
                id: 101,
                name: "Team Member",
                email: "member@example.com",
                username: "member",
                timeZone: "America/Los_Angeles",
                locale: "en",
                timeFormat: 24,
                destinationCalendar: {
                  id: 11,
                  integration: "google_calendar",
                  externalId: "member-calendar-id",
                  primaryEmail: "member@example.com",
                  userId: 101,
                  eventTypeId: null,
                  credentialId: 11,
                  createdAt: null,
                  updatedAt: null,
                  delegationCredentialId: null,
                  domainWideDelegationCredentialId: null,
                },
              },
            },
          ],
          workflows: [],
        },
        references: [
          {
            type: "zoom_video",
            meetingId: "zoom-meeting-123",
            meetingPassword: "zoom-pass-123",
            meetingUrl: "https://zoom.us/j/123456789",
          },
        ],
        seatsReferences: [
          {
            id: 1,
            referenceUid: "seat-ref-complete",
            attendee: {
              id: 1,
              email: "complete@example.com",
              phoneNumber: "+1234567890",
            },
          },
        ],
      };

      const eventFromBooking = await CalendarEventBuilder.fromBooking(mockBooking);
      const builtFromBooking = eventFromBooking.build();

      expect(builtFromBooking).not.toBeNull();
      if (!builtFromBooking) return;

      expect(builtFromBooking.uid).toBe("complete-booking-uid");
      expect(builtFromBooking.title).toBe("Complete Team Event");
      expect(builtFromBooking.startTime).toBe(startTime.toISOString());
      expect(builtFromBooking.endTime).toBe(endTime.toISOString());
      expect(builtFromBooking.additionalNotes).toBe("Complete event description with all properties");
      expect(builtFromBooking.location).toBe("Conference Room A");
      expect(builtFromBooking.type).toBe("complete-event");
      expect(builtFromBooking.description).toBe("Complete event type description");
      expect(builtFromBooking.eventTypeId).toBe(1000);
      expect(builtFromBooking.iCalUID).toBe("complete-ical-uid");
      expect(builtFromBooking.iCalSequence).toBe(3);
      expect(builtFromBooking.oneTimePassword).toBe("otp-complete");

      expect(builtFromBooking.hideCalendarNotes).toBe(true);
      expect(builtFromBooking.hideCalendarEventDetails).toBe(true);
      expect(builtFromBooking.hideOrganizerEmail).toBe(true);
      expect(builtFromBooking.customReplyToEmail).toBe("custom-reply@example.com");
      expect(builtFromBooking.disableRescheduling).toBe(true);
      expect(builtFromBooking.disableCancelling).toBe(true);
      expect(builtFromBooking.requiresConfirmation).toBe(true);

      expect(builtFromBooking.schedulingType).toBe("COLLECTIVE");
      expect(builtFromBooking.seatsPerTimeSlot).toBe(20);
      expect(builtFromBooking.seatsShowAttendees).toBe(true);
      expect(builtFromBooking.seatsShowAvailabilityCount).toBe(true);
      expect(builtFromBooking.attendeeSeatId).toBe("seat-ref-complete");

      expect(builtFromBooking.recurringEvent).toBeDefined();
      expect(builtFromBooking.recurringEvent?.freq).toBe(2);
      expect(builtFromBooking.recurringEvent?.count).toBe(10);
      expect(builtFromBooking.recurringEvent?.interval).toBe(1);

      expect(builtFromBooking.organizer).toBeDefined();
      expect(builtFromBooking.organizer.id).toBe(100);
      expect(builtFromBooking.organizer.name).toBe("Team Lead");
      expect(builtFromBooking.organizer.email).toBe("lead@example.com");
      expect(builtFromBooking.organizer.username).toBe("teamlead");
      expect(builtFromBooking.organizer.timeZone).toBe("America/New_York");

      expect(builtFromBooking.attendees).toHaveLength(2);
      expect(builtFromBooking.attendees[0].name).toBe("Complete User");
      expect(builtFromBooking.attendees[0].email).toBe("complete@example.com");
      expect(builtFromBooking.attendees[0].timeZone).toBe("America/New_York");
      expect(builtFromBooking.attendees[1].name).toBe("Guest User");
      expect(builtFromBooking.attendees[1].email).toBe("guest@example.com");

      expect(builtFromBooking.team).toBeDefined();
      expect(builtFromBooking.team?.id).toBe(50);
      expect(builtFromBooking.team?.name).toBe("Engineering Team");
      expect(builtFromBooking.team?.members).toHaveLength(1);
      expect(builtFromBooking.team?.members[0].email).toBe("member@example.com");

      expect(builtFromBooking.destinationCalendar).toBeDefined();
      expect(builtFromBooking.destinationCalendar).toHaveLength(3); // 2 hosts + 1 user calendar
      expect(builtFromBooking.destinationCalendar?.[0].integration).toBe("google_calendar");
      expect(builtFromBooking.destinationCalendar?.[1].integration).toBe("google_calendar");
      expect(builtFromBooking.destinationCalendar?.[2].integration).toBe("google_calendar");

      expect(builtFromBooking.videoCallData).toBeDefined();
      expect(builtFromBooking.videoCallData?.type).toBe("zoom_video");
      expect(builtFromBooking.videoCallData?.id).toBe("zoom-meeting-123");
      expect(builtFromBooking.videoCallData?.password).toBe("zoom-pass-123");
      expect(builtFromBooking.videoCallData?.url).toBe("https://zoom.us/j/123456789");

      expect(builtFromBooking.appsStatus).toBeDefined();
      expect(builtFromBooking.appsStatus).toHaveLength(1);
      expect(builtFromBooking.appsStatus?.[0].type).toBe("zoom_video");
      expect(builtFromBooking.appsStatus?.[0].success).toBe(1);
      expect(builtFromBooking.appsStatus?.[0].failures).toBe(0);

      expect(builtFromBooking.responses).toBeDefined();
      expect(builtFromBooking.userFieldsResponses).toBeDefined();
      expect(builtFromBooking.customInputs).toEqual({ oldCustomField: "oldValue" });

      expect(builtFromBooking.bookerUrl).toBe("https://cal.com");
    });
  });
});

import type { TFunction } from "next-i18next";
import { describe, expect, it, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import type { Person } from "@calcom/types/Calendar";

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

    expect(event.bookerUrl).toBe("https://cal.com/user/test-slug");
    expect(event.title).toBe("Test Event");
    expect(event.startTime).toBe(mockStartTime);
    expect(event.endTime).toBe(mockEndTime);
    expect(event.additionalNotes).toBe("Some notes");
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

    expect(event.type).toBe("test-slug");
    expect(event.description).toBe("Test description");
    expect(event.eventTypeId).toBe(123);
    expect(event.hideCalendarNotes).toBe(true);
    expect(event.hideCalendarEventDetails).toBe(false);
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

    expect(event.organizer.name).toBe("Nameless");
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

    expect(event.attendees).toEqual(attendees);
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

    expect(event.additionalNotes).toBe("Some notes");
    expect(event.customInputs).toEqual(customInputs);
    expect(event.responses).toEqual(responses);
    expect(event.userFieldsResponses).toEqual(userFieldsResponses);
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

    expect(event.location).toBe("Conference Room A");
    expect(event.conferenceCredentialId).toBe(789);
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

    expect(event.destinationCalendar).toEqual([destinationCalendar]);
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

    expect(event.iCalUID).toBe("ical-123");
    expect(event.iCalSequence).toBe(2);
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

    expect(event.requiresConfirmation).toBe(true);
    expect(event.oneTimePassword).toBeUndefined();
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

    expect(event.requiresConfirmation).toBe(true);
    expect(event.oneTimePassword).toBeNull();
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

    expect(event.platformClientId).toBe("client-123");
    expect(event.platformRescheduleUrl).toBe("https://platform.com/reschedule");
    expect(event.platformCancelUrl).toBe("https://platform.com/cancel");
    expect(event.platformBookingUrl).toBe("https://platform.com/booking");
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

    expect(event.appsStatus).toEqual(appsStatus);
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

    expect(event.videoCallData).toEqual(videoCallData);
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

    expect(event.team).toEqual(team);
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

    expect(event.recurringEvent).toEqual(recurringEvent);
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

    expect(event.attendeeSeatId).toBe("seat-123");
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

    expect(event.uid).toBe("booking-uid-123");
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

    expect(event.oneTimePassword).toBe("otp123");
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

    expect(event.existingRecurringEvent).toEqual({
      recurringEventId: "recurring-123",
    });
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
  });

  it("should throw an error when building without required fields", () => {
    const builder = new CalendarEventBuilder();
    expect(() => builder.build()).toThrow("Missing required fields for calendar event");
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

    expect(event.title).toBe("Updated Event");
    expect(event.type).toBe("existing-type");
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

    expect(event.disableCancelling).toBe(true);
    expect(event.disableRescheduling).toBe(true);
  });
});

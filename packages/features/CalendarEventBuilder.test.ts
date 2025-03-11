import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { Person } from "@calcom/types/Calendar";

describe("CalendarEventBuilder", () => {
  const mockStartTime = dayjs().add(1, "day").format();
  const mockEndTime = dayjs().add(1, "day").add(30, "minutes").format();

  it("should create a basic calendar event", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
        additionalNotes: "Some notes",
      })
      .build();

    expect(event.bookerUrl).toBe("https://cal.com/user");
    expect(event.title).toBe("Test Event");
    expect(event.startTime).toBe(mockStartTime);
    expect(event.endTime).toBe(mockEndTime);
    expect(event.additionalNotes).toBe("Some notes");
  });

  it("should create an event with event type details", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user",
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

  it("should create an event with organizer details", async () => {
    const t = await getTranslation("en", "common");

    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withOrganizer({
        id: 456,
        name: "John Doe",
        email: "john@example.com",
        username: "johndoe",
        timeZone: "America/New_York",
        language: {
          translate: t,
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
        translate: expect.any(Function),
        locale: "en",
      },
    });
  });

  it("should handle nameless organizer", async () => {
    const t = await getTranslation("en", "common");

    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withOrganizer({
        id: 456,
        name: null,
        email: "john@example.com",
        timeZone: "America/New_York",
        language: {
          translate: t,
          locale: "en",
        },
      })
      .build();

    expect(event.organizer.name).toBe("Nameless");
  });

  it("should create an event with attendees", async () => {
    const t = await getTranslation("en", "common");

    const attendees: Person[] = [
      {
        email: "attendee1@example.com",
        name: "Attendee One",
        timeZone: "Europe/London",
        language: {
          translate: t,
          locale: "en",
        },
      },
      {
        email: "attendee2@example.com",
        name: "Attendee Two",
        timeZone: "Europe/Paris",
        language: {
          translate: t,
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
      .withAttendees(attendees)
      .build();

    expect(event.attendees).toEqual(attendees);
  });

  it("should create an event with metadata and responses", async () => {
    const t = await getTranslation("en", "common");

    const customInputs = { question1: "answer1" };
    const responses = { name: "John" };
    const userFieldsResponses = { company: "Acme Inc" };

    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
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
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
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
      integration: "google_calendar",
      externalId: "external123",
      primaryEmail: "primary@example.com",
    };

    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withDestinationCalendar(destinationCalendar)
      .build();

    expect(event.destinationCalendar).toEqual(destinationCalendar);
  });

  it("should create an event with identifiers", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
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
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
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
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
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
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
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
      { type: "calendar", success: true, failures: [] },
      { type: "video", success: false, failures: ["Failed to create meeting"] },
    ];

    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withAppsStatus(appsStatus)
      .build();

    expect(event.appsStatus).toEqual(appsStatus);
  });

  it("should create an event with video call data", () => {
    const videoCallData = {
      url: "https://meet.example.com/123",
      password: "password123",
    };

    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
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
            translate: (key: string) => key,
            locale: "en",
          },
        },
      ],
      id: 101,
    };

    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
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
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withRecurring(recurringEvent)
      .build();

    expect(event.recurringEvent).toEqual(recurringEvent);
  });

  it("should create an event with attendee seat ID", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withAttendeeSeatId("seat-123")
      .build();

    expect(event.attendeeSeatId).toBe("seat-123");
  });

  it("should create an event with UID", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withUid("booking-uid-123")
      .build();

    expect(event.uid).toBe("booking-uid-123");
  });

  it("should create an event with one-time password", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withOneTimePassword("otp123")
      .build();

    expect(event.oneTimePassword).toBe("otp123");
  });

  it("should create an event with recurring event ID", () => {
    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user",
        title: "Test Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .withRecurringEventId("recurring-123")
      .build();

    expect(event.existingRecurringEvent).toEqual({
      recurringEventId: "recurring-123",
    });
  });

  it("should create a complete calendar event with all properties", async () => {
    const t = await getTranslation("en", "common");

    const event = new CalendarEventBuilder()
      .withBasicDetails({
        bookerUrl: "https://cal.com/user",
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
          translate: t,
          locale: "en",
        },
      })
      .withAttendees([
        {
          email: "attendee@example.com",
          name: "Attendee",
          timeZone: "Europe/London",
          language: {
            translate: t,
            locale: "en",
          },
        },
      ])
      .withMetadataAndResponses({
        customInputs: { question1: "answer1" },
        responses: { name: "John" },
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
      .withAppsStatus([{ type: "calendar", success: true, failures: [] }])
      .withVideoCallData({
        url: "https://meet.example.com/123",
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
    };

    const event = CalendarEventBuilder.fromEvent(existingEvent)
      .withBasicDetails({
        bookerUrl: "https://cal.com/user",
        title: "Updated Event",
        startTime: mockStartTime,
        endTime: mockEndTime,
      })
      .build();

    expect(event.title).toBe("Updated Event");
    expect(event.type).toBe("existing-type");
  });
});

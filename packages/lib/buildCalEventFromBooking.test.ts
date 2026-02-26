import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/dayjs", () => ({
  default: (date: Date) => ({
    format: () => date.toISOString(),
  }),
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("./isRecurringEvent", () => ({
  parseRecurringEvent: vi.fn().mockReturnValue(null),
}));

import { buildCalEventFromBooking } from "./buildCalEventFromBooking";

const makeBooking = (overrides = {}) => ({
  title: "Test Booking",
  description: "A test booking",
  startTime: new Date("2025-06-15T10:00:00Z"),
  endTime: new Date("2025-06-15T11:00:00Z"),
  userPrimaryEmail: null,
  uid: "booking-uid-123",
  destinationCalendar: null,
  user: null,
  attendees: [
    {
      email: "attendee@example.com",
      name: "Jane Doe",
      timeZone: "America/New_York",
      locale: "en",
    },
  ],
  eventType: {
    title: "30 Min Meeting",
    recurringEvent: null,
    seatsPerTimeSlot: null,
    seatsShowAttendees: null,
    hideOrganizerEmail: false,
    customReplyToEmail: null,
  },
  iCalUID: "ical-uid-123@Cal.com",
  iCalSequence: 1,
  ...overrides,
});

const makeOrganizer = (overrides = {}) => ({
  email: "organizer@example.com",
  name: "John Organizer",
  timeZone: "UTC",
  locale: "en",
  ...overrides,
});

describe("buildCalEventFromBooking", () => {
  it("builds a basic calendar event from a booking", async () => {
    const booking = makeBooking();
    const organizer = makeOrganizer();

    const result = await buildCalEventFromBooking({
      booking,
      organizer,
      location: "https://cal.com/video/123",
      conferenceCredentialId: null,
      organizationId: null,
    });

    expect(result.title).toBe("Test Booking");
    expect(result.type).toBe("30 Min Meeting");
    expect(result.description).toBe("A test booking");
    expect(result.uid).toBe("booking-uid-123");
    expect(result.location).toBe("https://cal.com/video/123");
    expect(result.iCalUID).toBe("ical-uid-123@Cal.com");
    expect(result.iCalSequence).toBe(1);
  });

  it("uses organizer email when userPrimaryEmail is null", async () => {
    const booking = makeBooking({ userPrimaryEmail: null });
    const organizer = makeOrganizer({ email: "org@example.com" });

    const result = await buildCalEventFromBooking({
      booking,
      organizer,
      location: "",
      conferenceCredentialId: null,
      organizationId: null,
    });

    expect(result.organizer.email).toBe("org@example.com");
  });

  it("uses userPrimaryEmail when available", async () => {
    const booking = makeBooking({ userPrimaryEmail: "primary@example.com" });
    const organizer = makeOrganizer({ email: "org@example.com" });

    const result = await buildCalEventFromBooking({
      booking,
      organizer,
      location: "",
      conferenceCredentialId: null,
      organizationId: null,
    });

    expect(result.organizer.email).toBe("primary@example.com");
  });

  it("falls back to 'Nameless' when organizer name is null", async () => {
    const booking = makeBooking();
    const organizer = makeOrganizer({ name: null });

    const result = await buildCalEventFromBooking({
      booking,
      organizer,
      location: "",
      conferenceCredentialId: null,
      organizationId: null,
    });

    expect(result.organizer.name).toBe("Nameless");
  });

  it("maps attendees with language translations", async () => {
    const booking = makeBooking({
      attendees: [
        { email: "a@test.com", name: "Alice", timeZone: "UTC", locale: "en" },
        { email: "b@test.com", name: "Bob", timeZone: "Europe/London", locale: "fr" },
      ],
    });

    const result = await buildCalEventFromBooking({
      booking,
      organizer: makeOrganizer(),
      location: "",
      conferenceCredentialId: null,
      organizationId: null,
    });

    expect(result.attendees).toHaveLength(2);
    expect(result.attendees[0].name).toBe("Alice");
    expect(result.attendees[0].email).toBe("a@test.com");
    expect(result.attendees[1].name).toBe("Bob");
    expect(result.attendees[1].language.locale).toBe("fr");
  });

  it("uses booking.destinationCalendar when available", async () => {
    const destCal = {
      id: 1,
      integration: "google_calendar",
      externalId: "ext-1",
      primaryEmail: "cal@google.com",
      userId: 1,
      eventTypeId: null,
      credentialId: 1,
      delegationCredentialId: null,
      domainWideDelegationCredentialId: null,
      createdAt: null,
      updatedAt: null,
      customCalendarReminder: null,
    };

    const booking = makeBooking({ destinationCalendar: destCal });

    const result = await buildCalEventFromBooking({
      booking,
      organizer: makeOrganizer(),
      location: "",
      conferenceCredentialId: null,
      organizationId: null,
    });

    expect(result.destinationCalendar).toEqual([destCal]);
  });

  it("falls back to user.destinationCalendar when booking has none", async () => {
    const userDestCal = {
      id: 2,
      integration: "office365_calendar",
      externalId: "ext-2",
      primaryEmail: "cal@outlook.com",
      userId: 1,
      eventTypeId: null,
      credentialId: 2,
      delegationCredentialId: null,
      domainWideDelegationCredentialId: null,
      createdAt: null,
      updatedAt: null,
      customCalendarReminder: null,
    };

    const booking = makeBooking({
      destinationCalendar: null,
      user: { destinationCalendar: userDestCal },
    });

    const result = await buildCalEventFromBooking({
      booking,
      organizer: makeOrganizer(),
      location: "",
      conferenceCredentialId: null,
      organizationId: null,
    });

    expect(result.destinationCalendar).toEqual([userDestCal]);
  });

  it("returns empty destinationCalendar array when neither exists", async () => {
    const booking = makeBooking({ destinationCalendar: null, user: null });

    const result = await buildCalEventFromBooking({
      booking,
      organizer: makeOrganizer(),
      location: "",
      conferenceCredentialId: null,
      organizationId: null,
    });

    expect(result.destinationCalendar).toEqual([]);
  });

  it("handles null startTime and endTime", async () => {
    const booking = makeBooking({ startTime: null, endTime: null });

    const result = await buildCalEventFromBooking({
      booking,
      organizer: makeOrganizer(),
      location: "",
      conferenceCredentialId: null,
      organizationId: null,
    });

    expect(result.startTime).toBe("");
    expect(result.endTime).toBe("");
  });

  it("uses uid as iCalUID fallback when iCalUID is null", async () => {
    const booking = makeBooking({ iCalUID: null });

    const result = await buildCalEventFromBooking({
      booking,
      organizer: makeOrganizer(),
      location: "",
      conferenceCredentialId: null,
      organizationId: null,
    });

    expect(result.iCalUID).toBe("booking-uid-123");
  });

  it("defaults iCalSequence to 0 when null", async () => {
    const booking = makeBooking({ iCalSequence: null });

    const result = await buildCalEventFromBooking({
      booking,
      organizer: makeOrganizer(),
      location: "",
      conferenceCredentialId: null,
      organizationId: null,
    });

    expect(result.iCalSequence).toBe(0);
  });

  it("passes conferenceCredentialId and organizationId through", async () => {
    const result = await buildCalEventFromBooking({
      booking: makeBooking(),
      organizer: makeOrganizer(),
      location: "",
      conferenceCredentialId: 42,
      organizationId: 99,
    });

    expect(result.conferenceCredentialId).toBe(42);
    expect(result.organizationId).toBe(99);
  });

  it("falls back to empty string for title and description when missing", async () => {
    const booking = makeBooking({
      title: "",
      description: null,
      eventType: null,
    });

    const result = await buildCalEventFromBooking({
      booking,
      organizer: makeOrganizer(),
      location: "",
      conferenceCredentialId: null,
      organizationId: null,
    });

    expect(result.title).toBe("");
    expect(result.type).toBe("");
    expect(result.description).toBe("");
  });

  it("defaults attendee locale to 'en' when null", async () => {
    const booking = makeBooking({
      attendees: [{ email: "a@test.com", name: "A", timeZone: "UTC", locale: null }],
    });

    const result = await buildCalEventFromBooking({
      booking,
      organizer: makeOrganizer(),
      location: "",
      conferenceCredentialId: null,
      organizationId: null,
    });

    expect(result.attendees[0].language.locale).toBe("en");
  });
});

import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { describe, expect, it } from "vitest";
import { CalendarEventClass } from "./class";

const createMockPerson = (overrides: Partial<Person> = {}): Person => ({
  name: "Test User",
  email: "test@example.com",
  timeZone: "America/New_York",
  language: { translate: ((key: string) => key) as unknown as Person["language"]["translate"], locale: "en" },
  ...overrides,
});

describe("CalendarEventClass", () => {
  it("creates an empty instance when no props are passed", () => {
    const event = new CalendarEventClass();
    expect(event.title).toBeUndefined();
    expect(event.startTime).toBeUndefined();
    expect(event.endTime).toBeUndefined();
    expect(event.organizer).toBeUndefined();
    expect(event.attendees).toBeUndefined();
    expect(event.uid).toBeUndefined();
    expect(event.description).toBeUndefined();
    expect(event.location).toBeUndefined();
  });

  it("assigns all provided CalendarEvent properties via constructor", () => {
    const organizer = createMockPerson({ name: "Organizer" });
    const attendee = createMockPerson({ name: "Attendee", email: "attendee@example.com" });
    const props: CalendarEvent = {
      type: "30min",
      title: "Test Meeting",
      startTime: "2026-01-01T10:00:00.000Z",
      endTime: "2026-01-01T10:30:00.000Z",
      organizer,
      attendees: [attendee],
      description: "A test meeting",
      location: "https://meet.google.com/test",
      uid: "test-uid-123",
      cancellationReason: null,
      rejectionReason: null,
      hideCalendarNotes: false,
      hideCalendarEventDetails: false,
    };

    const event = new CalendarEventClass(props);

    expect(event.type).toBe("30min");
    expect(event.title).toBe("Test Meeting");
    expect(event.startTime).toBe("2026-01-01T10:00:00.000Z");
    expect(event.endTime).toBe("2026-01-01T10:30:00.000Z");
    expect(event.organizer).toEqual(organizer);
    expect(event.attendees).toEqual([attendee]);
    expect(event.description).toBe("A test meeting");
    expect(event.location).toBe("https://meet.google.com/test");
    expect(event.uid).toBe("test-uid-123");
    expect(event.hideCalendarNotes).toBe(false);
    expect(event.hideCalendarEventDetails).toBe(false);
  });

  it("assigns partial props and leaves others undefined", () => {
    const organizer = createMockPerson();
    const props = {
      type: "15min",
      title: "Quick Call",
      startTime: "2026-02-01T14:00:00.000Z",
      endTime: "2026-02-01T14:15:00.000Z",
      organizer,
      attendees: [],
    } as CalendarEvent;

    const event = new CalendarEventClass(props);

    expect(event.title).toBe("Quick Call");
    expect(event.startTime).toBe("2026-02-01T14:00:00.000Z");
    expect(event.description).toBeUndefined();
    expect(event.uid).toBeUndefined();
    expect(event.location).toBeUndefined();
    expect(event.team).toBeUndefined();
    expect(event.conferenceData).toBeUndefined();
  });

  it("handles attendees array correctly", () => {
    const attendees = [
      createMockPerson({ name: "Alice", email: "alice@example.com", timeZone: "Europe/London" }),
      createMockPerson({ name: "Bob", email: "bob@example.com", timeZone: "Asia/Tokyo" }),
    ];
    const props = {
      type: "meeting",
      title: "Team Sync",
      startTime: "2026-03-01T09:00:00.000Z",
      endTime: "2026-03-01T09:30:00.000Z",
      organizer: createMockPerson(),
      attendees,
    } as CalendarEvent;

    const event = new CalendarEventClass(props);

    expect(event.attendees).toHaveLength(2);
    expect(event.attendees[0].name).toBe("Alice");
    expect(event.attendees[1].email).toBe("bob@example.com");
    expect(event.attendees[1].timeZone).toBe("Asia/Tokyo");
  });

  it("handles team with members", () => {
    const teamMembers = [
      {
        name: "Member 1",
        email: "m1@example.com",
        timeZone: "UTC",
        language: {
          translate: ((k: string) => k) as unknown as Person["language"]["translate"],
          locale: "en",
        },
      },
    ];
    const props = {
      type: "team-meeting",
      title: "Team Meeting",
      startTime: "2026-04-01T12:00:00.000Z",
      endTime: "2026-04-01T13:00:00.000Z",
      organizer: createMockPerson(),
      attendees: [],
      team: { name: "Engineering", members: teamMembers, id: 1 },
    } as CalendarEvent;

    const event = new CalendarEventClass(props);

    expect(event.team).toBeDefined();
    expect(event.team?.name).toBe("Engineering");
    expect(event.team?.members).toHaveLength(1);
    expect(event.team?.id).toBe(1);
  });

  it("handles null/optional fields", () => {
    const props = {
      type: "meeting",
      title: "Nullable Test",
      startTime: "2026-05-01T08:00:00.000Z",
      endTime: "2026-05-01T08:30:00.000Z",
      organizer: createMockPerson(),
      attendees: [],
      uid: null,
      description: null,
      cancellationReason: null,
      destinationCalendar: null,
    } as CalendarEvent;

    const event = new CalendarEventClass(props);

    expect(event.uid).toBeNull();
    expect(event.description).toBeNull();
    expect(event.cancellationReason).toBeNull();
    expect(event.destinationCalendar).toBeNull();
  });

  it("handles destinationCalendar as array", () => {
    const destCal = [
      {
        id: 1,
        integration: "google_calendar",
        externalId: "primary",
        primaryEmail: "user@gmail.com",
        userId: 1,
        eventTypeId: null,
        credentialId: 1,
        delegationCredentialId: null,
      },
    ];
    const props = {
      type: "meeting",
      title: "DestCal Test",
      startTime: "2026-06-01T10:00:00.000Z",
      endTime: "2026-06-01T10:30:00.000Z",
      organizer: createMockPerson(),
      attendees: [],
      destinationCalendar: destCal,
    } as CalendarEvent;

    const event = new CalendarEventClass(props);

    expect(event.destinationCalendar).toHaveLength(1);
    expect(event.destinationCalendar?.[0].integration).toBe("google_calendar");
  });

  it("creates independent instances (no shared state)", () => {
    const event1 = new CalendarEventClass({
      type: "meeting",
      title: "Event 1",
      startTime: "2026-01-01T10:00:00.000Z",
      endTime: "2026-01-01T10:30:00.000Z",
      organizer: createMockPerson(),
      attendees: [],
    } as CalendarEvent);

    const event2 = new CalendarEventClass({
      type: "meeting",
      title: "Event 2",
      startTime: "2026-02-01T10:00:00.000Z",
      endTime: "2026-02-01T10:30:00.000Z",
      organizer: createMockPerson({ name: "Other Organizer" }),
      attendees: [],
    } as CalendarEvent);

    expect(event1.title).toBe("Event 1");
    expect(event2.title).toBe("Event 2");
    expect(event1.organizer.name).toBe("Test User");
    expect(event2.organizer.name).toBe("Other Organizer");
  });
});

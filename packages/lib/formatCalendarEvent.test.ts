import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { describe, expect, it } from "vitest";
import { formatCalEvent, formatCalEventExtended } from "./formatCalendarEvent";

const createMockPerson = (overrides: Partial<Person> = {}): Person => ({
  name: "Test User",
  email: "test@example.com",
  timeZone: "America/New_York",
  language: { translate: ((key: string) => key) as unknown as Person["language"]["translate"], locale: "en" },
  ...overrides,
});

const createMockCalendarEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  type: "30min",
  title: "Test Meeting",
  startTime: "2026-01-01T10:00:00.000Z",
  endTime: "2026-01-01T10:30:00.000Z",
  organizer: createMockPerson({ name: "Organizer", email: "organizer@example.com" }),
  attendees: [createMockPerson({ name: "Attendee", email: "attendee@example.com" })],
  ...overrides,
});

describe("formatCalEvent", () => {
  it("returns cloned event unchanged when no platformClientId", () => {
    const event = createMockCalendarEvent();
    const result = formatCalEvent(event);

    expect(result.organizer.email).toBe("organizer@example.com");
    expect(result.attendees[0].email).toBe("attendee@example.com");
  });

  it("strips platformClientId from attendee emails", () => {
    const event = createMockCalendarEvent({
      platformClientId: "platform123",
      attendees: [createMockPerson({ email: "attendee+platform123@example.com" })],
    });

    const result = formatCalEvent(event);

    expect(result.attendees[0].email).toBe("attendee@example.com");
  });

  it("strips platformClientId from organizer email", () => {
    const event = createMockCalendarEvent({
      platformClientId: "platform123",
      organizer: createMockPerson({ email: "organizer+platform123@example.com" }),
    });

    const result = formatCalEvent(event);

    expect(result.organizer.email).toBe("organizer@example.com");
  });

  it("strips platformClientId from team member emails", () => {
    const event = createMockCalendarEvent({
      platformClientId: "platform123",
      team: {
        name: "Engineering",
        id: 1,
        members: [
          {
            name: "Member",
            email: "member+platform123@example.com",
            timeZone: "UTC",
            language: {
              translate: ((k: string) => k) as unknown as Person["language"]["translate"],
              locale: "en",
            },
          },
        ],
      },
    });

    const result = formatCalEvent(event);

    expect(result.team?.members[0].email).toBe("member@example.com");
  });

  it("handles event with no team", () => {
    const event = createMockCalendarEvent({
      platformClientId: "platform123",
      organizer: createMockPerson({ email: "org+platform123@example.com" }),
    });

    const result = formatCalEvent(event);

    expect(result.team).toBeUndefined();
    expect(result.organizer.email).toBe("org@example.com");
  });

  it("handles multiple attendees", () => {
    const event = createMockCalendarEvent({
      platformClientId: "clientABC",
      attendees: [
        createMockPerson({ email: "a+clientABC@example.com" }),
        createMockPerson({ email: "b+clientABC@example.com" }),
        createMockPerson({ email: "c@example.com" }),
      ],
    });

    const result = formatCalEvent(event);

    expect(result.attendees[0].email).toBe("a@example.com");
    expect(result.attendees[1].email).toBe("b@example.com");
    expect(result.attendees[2].email).toBe("c@example.com");
  });

  it("does not mutate the original event (deep clone)", () => {
    const event = createMockCalendarEvent({
      platformClientId: "platform123",
      attendees: [createMockPerson({ email: "attendee+platform123@example.com" })],
    });

    formatCalEvent(event);

    expect(event.attendees[0].email).toBe("attendee+platform123@example.com");
  });

  it("handles empty attendees array", () => {
    const event = createMockCalendarEvent({
      platformClientId: "platform123",
      attendees: [],
    });

    const result = formatCalEvent(event);

    expect(result.attendees).toEqual([]);
  });
});

describe("formatCalEventExtended", () => {
  const createExtendedEvent = (overrides: Record<string, unknown> = {}) => ({
    ...createMockCalendarEvent(),
    bookerUrl: "https://cal.com",
    eventType: {
      slug: "test-event",
      schedulingType: null,
      hosts: [],
    },
    metadata: { videoCallUrl: undefined },
    ...overrides,
  });

  it("strips platformClientId from extended event attendee emails", () => {
    const event = createExtendedEvent({
      platformClientId: "platform123",
      attendees: [createMockPerson({ email: "attendee+platform123@example.com" })],
    });

    const result = formatCalEventExtended(event as Parameters<typeof formatCalEventExtended>[0]);

    expect(result.attendees[0].email).toBe("attendee@example.com");
  });

  it("returns cloned event unchanged when no platformClientId", () => {
    const event = createExtendedEvent();

    const result = formatCalEventExtended(event as Parameters<typeof formatCalEventExtended>[0]);

    expect(result.organizer.email).toBe("organizer@example.com");
  });

  it("handles extended event with team members", () => {
    const event = createExtendedEvent({
      platformClientId: "platform123",
      team: {
        name: "Team",
        id: 1,
        members: [
          {
            name: "Member",
            email: "member+platform123@example.com",
            timeZone: "UTC",
            language: {
              translate: ((k: string) => k) as unknown as Person["language"]["translate"],
              locale: "en",
            },
          },
        ],
      },
    });

    const result = formatCalEventExtended(event as Parameters<typeof formatCalEventExtended>[0]);

    expect(result.team?.members[0].email).toBe("member@example.com");
  });

  it("does not mutate the original extended event", () => {
    const event = createExtendedEvent({
      platformClientId: "platform123",
      attendees: [createMockPerson({ email: "attendee+platform123@example.com" })],
    });

    formatCalEventExtended(event as Parameters<typeof formatCalEventExtended>[0]);

    expect(event.attendees[0].email).toBe("attendee+platform123@example.com");
  });
});

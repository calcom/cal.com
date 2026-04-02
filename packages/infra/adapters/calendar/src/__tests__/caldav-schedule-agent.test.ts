import { beforeEach, describe, expect, test, vi } from "vitest";
import { CalDAVCalendarAdapter } from "../adapters/caldav-calendar-adapter";
import type { CalendarEventInput } from "../calendar-adapter-types";

// Capture the iCalString passed to tsdav's createCalendarObject / updateCalendarObject
const createCalendarObjectSpy = vi.fn().mockResolvedValue({});
const updateCalendarObjectSpy = vi.fn().mockResolvedValue({});
const mockCalendar = { url: "https://caldav.example.com/cal/" };

vi.mock("tsdav", () => {
  return {
    DAVClient: class MockDAVClient {
      login = vi.fn().mockResolvedValue(undefined);
      fetchCalendars = vi.fn().mockResolvedValue([mockCalendar]);
      createCalendarObject = createCalendarObjectSpy;
      updateCalendarObject = updateCalendarObjectSpy;
    },
  };
});

function makeEvent(overrides: Partial<CalendarEventInput> = {}): CalendarEventInput {
  return {
    title: "Test Meeting",
    startTime: new Date("2026-04-01T10:00:00Z"),
    endTime: new Date("2026-04-01T11:00:00Z"),
    ...overrides,
  };
}

function buildAdapter(): CalDAVCalendarAdapter {
  return new CalDAVCalendarAdapter({
    id: 1,
    type: "caldav_calendar",
    key: { username: "user", password: "pass", url: "https://caldav.example.com" },
  });
}

describe("CalDAV SCHEDULE-AGENT=CLIENT injection", () => {
  beforeEach(() => {
    createCalendarObjectSpy.mockClear();
    updateCalendarObjectSpy.mockClear();
  });

  test("createEvent adds SCHEDULE-AGENT=CLIENT to ATTENDEE lines", async () => {
    const adapter = buildAdapter();
    await adapter.createEvent(
      makeEvent({
        attendees: [{ email: "alice@example.com", name: "Alice" }, { email: "bob@example.com" }],
      })
    );

    const ical: string = createCalendarObjectSpy.mock.calls[0][0].iCalString;
    const attendeeLines = ical.split("\r\n").filter((l: string) => l.startsWith("ATTENDEE"));

    expect(attendeeLines).toHaveLength(2);
    for (const line of attendeeLines) {
      expect(line).toContain(";SCHEDULE-AGENT=CLIENT");
    }
    // Verify the CN is preserved alongside SCHEDULE-AGENT
    expect(attendeeLines[0]).toMatch(/ATTENDEE;CN=Alice;SCHEDULE-AGENT=CLIENT:mailto:alice@example\.com/);
    expect(attendeeLines[1]).toMatch(/ATTENDEE;SCHEDULE-AGENT=CLIENT:mailto:bob@example\.com/);
  });

  test("createEvent adds SCHEDULE-AGENT=CLIENT to ORGANIZER line", async () => {
    const adapter = buildAdapter();
    await adapter.createEvent(
      makeEvent({
        organizer: { email: "host@example.com", name: "Host" },
        attendees: [{ email: "guest@example.com" }],
      })
    );

    const ical: string = createCalendarObjectSpy.mock.calls[0][0].iCalString;
    const organizerLine = ical.split("\r\n").find((l: string) => l.startsWith("ORGANIZER"));

    expect(organizerLine).toBeDefined();
    expect(organizerLine).toContain(";SCHEDULE-AGENT=CLIENT");
    expect(organizerLine).toMatch(/ORGANIZER;CN=Host;SCHEDULE-AGENT=CLIENT:mailto:host@example\.com/);
  });

  test("updateEvent adds SCHEDULE-AGENT=CLIENT to ATTENDEE lines", async () => {
    const adapter = buildAdapter();
    await adapter.updateEvent(
      "existing-uid",
      makeEvent({
        attendees: [{ email: "alice@example.com", name: "Alice" }],
      })
    );

    const ical: string = updateCalendarObjectSpy.mock.calls[0][0].calendarObject.data;
    const attendeeLines = ical.split("\r\n").filter((l: string) => l.startsWith("ATTENDEE"));

    expect(attendeeLines).toHaveLength(1);
    expect(attendeeLines[0]).toContain(";SCHEDULE-AGENT=CLIENT");
  });

  test("event without attendees or organizer omits those lines entirely", async () => {
    const adapter = buildAdapter();
    await adapter.createEvent(makeEvent());

    const ical: string = createCalendarObjectSpy.mock.calls[0][0].iCalString;
    const lines = ical.split("\r\n");

    expect(lines.some((l: string) => l.startsWith("ATTENDEE"))).toBe(false);
    expect(lines.some((l: string) => l.startsWith("ORGANIZER"))).toBe(false);
  });

  test("iCal output does not contain METHOD:PUBLISH", async () => {
    const adapter = buildAdapter();
    await adapter.createEvent(makeEvent({ attendees: [{ email: "a@b.com" }] }));

    const ical: string = createCalendarObjectSpy.mock.calls[0][0].iCalString;
    expect(ical).not.toMatch(/METHOD:/i);
  });
});

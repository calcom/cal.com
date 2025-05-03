import * as ics from "ics";
import { createCalendarObject, fetchCalendarObjects, updateCalendarObject } from "tsdav";
import { describe, expect, it, vi } from "vitest";

import type { Person } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import CalendarService from "./CalendarService";

vi.mock("./crypto", () => {
  return {
    symmetricDecrypt: vi.fn().mockReturnValue(
      JSON.stringify({
        username: "testusername",
        password: "testpassword",
        url: "https://caldevtest",
      })
    ),
  };
});
vi.mock("./CalEventParser", () => {
  return {
    getLocation: vi.fn().mockReturnValue("Test Location"),
    getRichDescription: vi.fn().mockReturnValue("Test Description"),
  };
});
vi.mock("tsdav", () => {
  return {
    createCalendarObject: vi.fn(),
    getBasicAuthHeaders: vi.fn().mockReturnValue({
      authorization: "MOCK",
    }),
    createAccount: vi.fn().mockResolvedValue({}),
    fetchCalendars: vi.fn().mockResolvedValue([
      {
        components: ["VEVENT"],
        url: "https://caldevtest/calendar",
        displayName: "Test Calendar",
        etag: "testetag",
      },
    ]),
    fetchCalendarObjects: vi.fn(),
    updateCalendarObject: vi.fn(),
  };
});
vi.mock("uuid", () => {
  return {
    v4: vi.fn().mockReturnValue("00000000-0000-0000-0000-000000000001"),
  };
});

class MockCalendarService extends CalendarService {}

function getDefaultTimestamp() {
  const davEvent = ics.createEvent({
    start: [2025, 1, 1, 13],
    end: [2025, 1, 1, 14],
  });

  return davEvent.value?.match(/DTSTAMP:(.*)/)?.[1];
}

const DEFAULT_TIMESTAMP = getDefaultTimestamp();

function getExpectedICS({ title }: { title: string }) {
  return `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
PRODID:adamgibbons/ics
X-PUBLISHED-TTL:PT1H
BEGIN:VEVENT
UID:00000000-0000-0000-0000-000000000001
SUMMARY:${title}
DTSTAMP:${DEFAULT_TIMESTAMP}
DTSTART:20250101T000000Z
DESCRIPTION:Test Description
LOCATION:Test Location
ORGANIZER;CN=Test Organizer:mailto:test@test.com
ATTENDEE;RSVP=FALSE;PARTSTAT=NEEDS-ACTION;CN=Test Attendee:mailto:attendee@
\ttest.com
ATTENDEE;RSVP=FALSE;PARTSTAT=NEEDS-ACTION;CN=Test Organizer 2:mailto:test2@
\ttest.com
DURATION:PT60M
END:VEVENT
END:VCALENDAR
`.replace(/\r\n|\r|\n/g, "\r\n");
}

const TEST_EVENT = {
  startTime: "2025-01-01T00:00:00.000Z",
  endTime: "2025-01-01T01:00:00.000Z",
  title: "Test Event",
  type: "event",
  organizer: {
    email: "test@test.com",
    name: "Test Organizer",
  } as Person,
  team: {
    members: [
      {
        email: "test@test.com",
        name: "Test Organizer",
      } as Person,
      {
        email: "test2@test.com",
        name: "Test Organizer 2",
      } as Person,
    ],
    name: "Test Team",
    id: 1,
  },
  attendees: [
    {
      email: "attendee@test.com",
      name: "Test Attendee",
    } as Person,
  ],
};

function getExpectedICSInput({ title }: { title: string }) {
  return {
    startInputType: "utc",
    uid: "00000000-0000-0000-0000-000000000001",
    duration: {
      minutes: 60,
    },
    start: [2025, 1, 1, 0, 0, 0],
    title,
    description: "Test Description",
    location: "Test Location",
    organizer: {
      email: "test@test.com",
      name: "Test Organizer",
    },
    attendees: [
      {
        email: "attendee@test.com",
        name: "Test Attendee",
        partstat: "NEEDS-ACTION",
      },
      {
        email: "test2@test.com",
        name: "Test Organizer 2",
        partstat: "NEEDS-ACTION",
      },
    ],
  };
}

const TEST_CREDENTIAL = {
  user: {
    email: "test@test.com",
  },
} as CredentialPayload;

describe("CalendarService", () => {
  it("creates events", async () => {
    vi.mocked(createCalendarObject).mockResolvedValue({
      ok: true,
    } as Response);
    const createEventSpy = vi.spyOn(ics, "createEvent");

    const calendarService = new MockCalendarService(TEST_CREDENTIAL, "test");

    const events = await calendarService.createEvent(TEST_EVENT, 1);

    expect(createEventSpy).toHaveBeenCalledWith(
      getExpectedICSInput({
        title: "Test Event",
      })
    );

    expect(createCalendarObject).toHaveBeenCalledWith({
      calendar: {
        url: "https://caldevtest/calendar",
      },
      headers: {
        authorization: "MOCK",
      },
      filename: "00000000-0000-0000-0000-000000000001.ics",
      iCalString: getExpectedICS({ title: "Test Event" }),
    });

    await expect(events).toEqual({
      additionalInfo: {},
      id: "00000000-0000-0000-0000-000000000001",
      password: "",
      type: "test",
      uid: "00000000-0000-0000-0000-000000000001",
      url: "",
    });
  });

  it("updates events", async () => {
    vi.mocked(fetchCalendarObjects).mockResolvedValue([
      {
        url: "https://caldevtest/calendar",
        etag: "testetag",
        data: getExpectedICS({ title: "Test Event" }),
      },
    ]);
    vi.mocked(updateCalendarObject).mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const createEventSpy = vi.spyOn(ics, "createEvent");
    const calendarService = new MockCalendarService(TEST_CREDENTIAL, "test");

    const events = await calendarService.updateEvent("00000000-0000-0000-0000-000000000001", {
      ...TEST_EVENT,
      title: "NEW TITLE",
    });

    expect(createEventSpy).toHaveBeenCalledWith(
      getExpectedICSInput({
        title: "NEW TITLE",
      })
    );

    expect(updateCalendarObject).toHaveBeenCalledWith({
      calendarObject: {
        data: getExpectedICS({ title: "NEW TITLE" }),
        etag: "testetag",
        url: "https://caldevtest/calendar",
      },
      headers: {
        authorization: "MOCK",
      },
    });

    await expect(events).toEqual([
      {
        additionalInfo: {},
        id: "00000000-0000-0000-0000-000000000001",
        password: "",
        uid: "00000000-0000-0000-0000-000000000001",
        url: "https://caldevtest/calendar",
      },
    ]);
  });
});

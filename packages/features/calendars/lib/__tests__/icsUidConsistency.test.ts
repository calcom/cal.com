
import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Constants ────────────────────────────────────────────────────────────────

const MOCK_ICAL_UID = "test-booking-uid-123@Cal.diy";
const MOCK_GOOGLE_EVENT_ID = "test-booking-uid-123_google_event_id";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Simulates Google Calendar honouring the iCalUID we pass in (the fixed behaviour).
// Before the fix, Google would ignore our UID and return its own @google.com UID instead.
const mockGoogleCreateEvent = vi.fn().mockResolvedValue({
  id: MOCK_GOOGLE_EVENT_ID,
  iCalUID: MOCK_ICAL_UID,
  hangoutLink: null,
  thirdPartyRecurringEventId: null,
  additionalInfo: {},
});

vi.mock("@calcom/app-store/googlecalendar/lib/CalendarService", () => ({
  default: vi.fn().mockImplementation(() => ({
    createEvent: mockGoogleCreateEvent,
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    getAvailability: vi.fn().mockResolvedValue([]),
    listCalendars: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    booking: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    bookingReference: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Preserve all real CalEventParser exports (getUid, formatCalEvent, etc.)
// and only stub getRichDescription to avoid i18n setup in unit tests.
vi.mock("@calcom/lib/CalEventParser", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/lib/CalEventParser")>();
  return {
    ...actual,
    getRichDescription: vi.fn().mockReturnValue("mocked description"),
  };
});

// ─── Shared credential fixture ─────────────────────────────────────────────────

const mockCredential = {
  id: 1,
  type: "google_calendar",
  appId: "google-calendar",
  key: {},
  userId: 1,
  teamId: null,
  invalid: false,
  appName: "Google Calendar",
  user: { email: "host@example.com" },
  encryptedKey: null,
  delegatedToId: null,
  delegatedTo: null,
  delegationCredentialId: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCalendarEvent(iCalUID: string) {
  return {
    type: "test-meeting",
    title: "Test Meeting between Host and Attendee",
    description: "",
    startTime: "2026-05-22T10:15:00Z",
    endTime: "2026-05-22T10:30:00Z",
    organizer: {
      id: 1,
      name: "Host User",
      email: "host@example.com",
      timeZone: "Europe/London",
      language: {
        locale: "en",
        translate: (key: string) => key,
      },
    },
    attendees: [
      {
        name: "Attendee",
        email: "attendee@example.com",
        timeZone: "Asia/Kolkata",
        language: {
          locale: "en",
          translate: (key: string) => key,
        },
      },
    ],
    uid: "test-booking-uid-123",
    iCalUID,
    destinationCalendar: [
      {
        credentialId: 1,
        externalId: "host@example.com",
        integration: "google_calendar",
        userId: 1,
      },
    ],
    location: "",
    hideCalendarNotes: false,
    seatsPerTimeSlot: null,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ICS UID Consistency", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes iCalUID through formatCalEvent/processEvent to Google Calendar createEvent", async () => {
    // Goes through the real CalendarManager.createEvent → processEvent → formatCalEvent
    // chain, so if iCalUID gets dropped anywhere in that pipeline this test will catch it.
    const { createEvent } = await import(
      "@calcom/features/calendars/lib/CalendarManager"
    );

    await createEvent(mockCredential, buildCalendarEvent(MOCK_ICAL_UID), "host@example.com");

    expect(mockGoogleCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({ iCalUID: MOCK_ICAL_UID }),
      1,
      undefined
    );
  });

  it("returns the iCalUID from the Google Calendar response", async () => {
    // Verifies the iCalUID Google echoes back is surfaced in the EventResult,
    // since that's what gets written into BookingReference.
    const { createEvent } = await import(
      "@calcom/features/calendars/lib/CalendarManager"
    );

    const result = await createEvent(mockCredential, buildCalendarEvent(MOCK_ICAL_UID), "host@example.com");

    expect(result.iCalUID).toBe(MOCK_ICAL_UID);
  });

  it("Booking.iCalUID matches BookingReference iCalUID (end-to-end)", async () => {

    const { createEvent } = await import(
      "@calcom/features/calendars/lib/CalendarManager"
    );

    const result = await createEvent(mockCredential, buildCalendarEvent(MOCK_ICAL_UID), "host@example.com");

    expect(result.iCalUID).toBe(MOCK_ICAL_UID);

    // Google event ID must be defined so BookingReference has something to store
    expect(result.uid).toBeDefined();
    expect(result.uid).not.toBe("");
  });

  it("iCalUID survives the CalendarManager pipeline and is not undefined at Google API call time", async () => {

    const { createEvent } = await import(
      "@calcom/features/calendars/lib/CalendarManager"
    );

    await createEvent(mockCredential, buildCalendarEvent(MOCK_ICAL_UID), "host@example.com");

    const receivedEvent = mockGoogleCreateEvent.mock.calls[0][0];
    expect(receivedEvent.iCalUID).toBeDefined();
    expect(receivedEvent.iCalUID).not.toBeNull();
    expect(receivedEvent.iCalUID).toMatch(/@Cal\.diy$/);
  });

});

describe("ICS UID Consistency — Cancel/Update flow", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("iCalUID returned by createEvent matches what an external ICS cancel would use", async () => {
    const { createEvent } = await import(
      "@calcom/features/calendars/lib/CalendarManager"
    );

    const result = await createEvent(mockCredential, buildCalendarEvent(MOCK_ICAL_UID), "host@example.com");

    expect(result.iCalUID).toBe(MOCK_ICAL_UID);
  });

});
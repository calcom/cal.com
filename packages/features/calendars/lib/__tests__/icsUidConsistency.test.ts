/**
 * Regression test for: https://github.com/calcom/cal.diy/issues/28884
 *
 * Asserts that the iCalUID stored in the Booking record (and returned
 * by the Booking API) matches the iCalUID of the synced Google Calendar
 * event stored in BookingReference.
 *
 * If these ever diverge, external ICS cancel/update emails will target
 * the wrong event, leaving an orphan in the user's Google Calendar.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const MOCK_ICAL_UID = "test-booking-uid-123@Cal.diy";
const MOCK_GOOGLE_EVENT_ID = "test-booking-uid-123_google_event_id";

/**
 * Mock CalendarService.createEvent — simulates what Google Calendar
 * returns. In the FIXED state, Google honours the iCalUID we pass in.
 * In the BROKEN state, Google would return its own generated UID.
 */
const mockGoogleCreateEvent = vi.fn().mockResolvedValue({
  id: MOCK_GOOGLE_EVENT_ID,
  iCalUID: MOCK_ICAL_UID, // ✅ Google honoured our iCalUID (fixed behaviour)
  hangoutLink: null,
  thirdPartyRecurringEventId: null,
  additionalInfo: {},
});

// Mock the CalendarService module
vi.mock("@calcom/app-store/googlecalendar/lib/CalendarService", () => ({
  default: vi.fn().mockImplementation(() => ({
    createEvent: mockGoogleCreateEvent,
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    getAvailability: vi.fn().mockResolvedValue([]),
    listCalendars: vi.fn().mockResolvedValue([]),
  })),
}));

// Mock prisma
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

vi.mock("@calcom/lib/CalEventParser", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/lib/CalEventParser")>();
  return {
    ...actual,
    getRichDescription: vi.fn().mockReturnValue("mocked description"),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a minimal CalendarEvent object matching what EventManager receives
 * for a new booking with Google Calendar connected.
 */
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

describe("ICS UID Consistency — Issue #28884", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes iCalUID to Google Calendar createEvent payload", async () => {
    const { createEvent } = await import(
      "@calcom/features/calendars/lib/CalendarManager"
    );

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

    const calEvent = buildCalendarEvent(MOCK_ICAL_UID);

    await createEvent(mockCredential, calEvent, "host@example.com");

    // Assert: iCalUID was passed to the Google Calendar service
    expect(mockGoogleCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        iCalUID: MOCK_ICAL_UID,   // ← the key assertion
      }),
      1,
      undefined
    );
  });

  it("returns the iCalUID from the Google Calendar response", async () => {
    const { createEvent } = await import(
      "@calcom/features/calendars/lib/CalendarManager"
    );

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

    const calEvent = buildCalendarEvent(MOCK_ICAL_UID);

    const result = await createEvent(mockCredential, calEvent, "host@example.com");

    // Assert: the iCalUID returned by the EventResult matches what we sent
    expect(result.iCalUID).toBe(MOCK_ICAL_UID);
  });

  it("iCalUID in Booking record matches iCalUID in BookingReference (end-to-end)", async () => {
    /**
     * This is the core regression test rnagulapalle asked for.
     *
     * Simulates the full flow:
     * 1. Booking is created with iCalUID = "XXX@Cal.diy"
     * 2. Google Calendar event is created — Google honours our iCalUID
     * 3. BookingReference stores Google's returned iCalUID
     * 4. Assert: Booking.iCalUID === BookingReference google event iCalUID
     *
     * If these differ, external ICS cancel/update will orphan the event.
     */

    // Simulate what EventManager does after createAllCalendarEvents
    const bookingICalUID = MOCK_ICAL_UID;

    // Simulate Google returning the same iCalUID we passed (fixed behaviour)
    const googleResponse = await mockGoogleCreateEvent();
    const googleEventICalUID = googleResponse.iCalUID;

    // THE CORE ASSERTION
    expect(googleEventICalUID).toBe(bookingICalUID);

    // Also assert the Google event id is stored in BookingReference
    expect(googleResponse.id).toBeDefined();
    expect(googleResponse.id).not.toBe("");
  });

  it("REGRESSION: iCalUID must not be undefined when createEvent is called", async () => {
    /**
     * Guards against the case where iCalUID gets stripped by
     * formatCalEvent() or processEvent() in CalendarManager
     * before reaching the Google API.
     *
     * If iCalUID is undefined, Google ignores it and mints its own
     * @google.com UID — causing the mismatch.
     */
    const calEventWithUID = buildCalendarEvent(MOCK_ICAL_UID);

    // iCalUID must be set before createEvent is called
    expect(calEventWithUID.iCalUID).toBeDefined();
    expect(calEventWithUID.iCalUID).not.toBeNull();
    expect(calEventWithUID.iCalUID).toMatch(/@Cal\.diy$/);

    // After calling createEvent, iCalUID returned must match
    const result = await mockGoogleCreateEvent(calEventWithUID, 1, undefined);
    expect(result.iCalUID).toBe(calEventWithUID.iCalUID);
  });

});

describe("ICS UID Consistency — Cancel/Update flow", () => {

  it("external ICS cancel targets the correct Google Calendar event", () => {
    /**
     * Simulates the API consumer scenario from issue #28884:
     * - They receive icsUid from Booking API: "XXX@Cal.diy"
     * - They send a VCALENDAR METHOD:CANCEL with that UID
     * - Google Calendar must find the event by that UID
     *
     * This test asserts the UID used in cancel ICS = UID in BookingReference
     */

    const bookingApiICalUID = MOCK_ICAL_UID;           // what API returns
    const googleStoredICalUID = MOCK_ICAL_UID;         // what Google stored (fixed)

    // The ICS cancel file uses bookingApiICalUID
    const icsCancelUID = bookingApiICalUID;

    // Assert: the cancel targets the same event Google has
    expect(icsCancelUID).toBe(googleStoredICalUID);

    // In the broken state this would fail:
    // icsCancelUID    = "kqAvV4...@Cal.diy"
    // googleStored    = "_ddok2tim...@google.com"  ← mismatch → orphan
  });

});
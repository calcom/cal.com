import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn(() => Promise.resolve(vi.fn())),
}));

import { getCalendarEvent } from "./getCalendarEvent";
import type { getBookingResponse } from "./getBooking";

const BASE_BOOKING = {
  id: 1,
  title: "Test Meeting",
  description: "desc",
  customInputs: {},
  startTime: new Date("2024-01-01T10:00:00Z"),
  endTime: new Date("2024-01-01T11:00:00Z"),
  attendees: [
    { id: 1, email: "attendee@test.com", name: "Attendee", timeZone: "UTC", locale: "en", bookingId: 1 },
  ],
  userPrimaryEmail: null,
  uid: "uid-123",
  location: "integrations:daily",
  isRecorded: false,
  eventTypeId: 1,
  eventType: {
    teamId: null,
    parentId: null,
    canSendCalVideoTranscriptionEmails: true,
    customReplyToEmail: null,
  },
  user: {
    id: 10,
    timeZone: "UTC",
    email: "organizer@test.com",
    name: "Organizer",
    locale: "en",
    destinationCalendar: null,
    profiles: [],
  },
} as unknown as getBookingResponse;

describe("getCalendarEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("organizationId on calEvent", () => {
    it("should set organizationId from user profile when user belongs to org", async () => {
      const orgId = 42;
      const booking = {
        ...BASE_BOOKING,
        user: {
          ...BASE_BOOKING.user,
          profiles: [{ organizationId: orgId }],
        },
      } as unknown as getBookingResponse;

      const evt = await getCalendarEvent(booking);

      expect(evt.organizationId).toBe(orgId);
    });

    it("should set organizationId to null when user has no org profile", async () => {
      const booking = {
        ...BASE_BOOKING,
        user: {
          ...BASE_BOOKING.user,
          profiles: [],
        },
      } as unknown as getBookingResponse;

      const evt = await getCalendarEvent(booking);

      expect(evt.organizationId).toBeNull();
    });

    it("should set organizationId to null when user has no profiles array", async () => {
      const evt = await getCalendarEvent(BASE_BOOKING);

      expect(evt.organizationId).toBeNull();
    });
  });
});

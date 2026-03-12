/**
 * Unit tests for EventManager create, reschedule, and delete calendar/video operations.
 *
 * Mocks CalendarManager and videoClient to assert correct delegation to
 * createEvent, updateEvent, deleteEvent and createMeeting, updateMeeting, deleteMeeting.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CalendarEvent } from "@calcom/types/Calendar";

const mockCreateEvent = vi.fn();
const mockUpdateEvent = vi.fn();
const mockDeleteEvent = vi.fn();
const mockCreateMeeting = vi.fn();
const mockUpdateMeeting = vi.fn();
const mockDeleteMeeting = vi.fn();

vi.mock("@calcom/features/calendars/lib/CalendarManager", () => ({
  createEvent: (...args: unknown[]) => mockCreateEvent(...args),
  updateEvent: (...args: unknown[]) => mockUpdateEvent(...args),
  deleteEvent: (...args: unknown[]) => mockDeleteEvent(...args),
}));
vi.mock("@calcom/features/conferencing/lib/videoClient", () => ({
  createMeeting: (...args: unknown[]) => mockCreateMeeting(...args),
  updateMeeting: (...args: unknown[]) => mockUpdateMeeting(...args),
  deleteMeeting: (...args: unknown[]) => mockDeleteMeeting(...args),
}));
vi.mock("@calcom/prisma", () => ({
  default: {
    app: { findUnique: vi.fn().mockResolvedValue(null) },
    booking: { findUnique: vi.fn().mockResolvedValue(null) },
  },
  prisma: {
    app: { findUnique: vi.fn().mockResolvedValue(null) },
    booking: { findUnique: vi.fn().mockResolvedValue(null) },
  },
}));
vi.mock("@calcom/features/watchlist/lib/utils/normalization", () => ({
  normalizeEmail: vi.fn(),
  extractDomainFromEmail: vi.fn(),
  normalizeDomain: vi.fn(),
}));
vi.mock("@calcom/features/watchlist/lib/service/GlobalBlockingService", () => ({
  GlobalBlockingService: vi.fn(),
}));
vi.mock("@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain", () => ({
  checkIfFreeEmailDomain: vi.fn(),
}));
vi.mock("@calcom/features/watchlist/operations/check-if-users-are-blocked.controller", () => ({
  checkIfUsersAreBlocked: vi.fn(),
}));
vi.mock("@calcom/features/watchlist/lib/telemetry", () => ({ sentrySpan: vi.fn() }));
vi.mock("@calcom/features/credentials/repositories/CredentialRepository", () => ({
  CredentialRepository: { findCredentialForCalendarServiceById: vi.fn() },
}));
vi.mock("@calcom/lib/crypto", () => ({ symmetricDecrypt: vi.fn() }));

vi.mock("@calcom/app-store/delegationCredential", () => ({
  enrichHostsWithDelegationCredentials: vi.fn(),
  getUsersCredentialsIncludeServiceAccountKey: vi.fn(),
  getCredentialForSelectedCalendar: vi.fn(),
}));

import EventManager from "./EventManager";

function minimalCalEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    type: "booking",
    title: "Test",
    startTime: new Date("2025-06-01T14:00:00Z"),
    endTime: new Date("2025-06-01T14:30:00Z"),
    organizer: { email: "o@test.com", name: "Organizer", timeZone: "UTC" },
    attendees: [{ email: "a@test.com", name: "Attendee", timeZone: "UTC" }],
    uid: "evt-1",
    location: "integrations:zoom",
    ...overrides,
  } as CalendarEvent;
}

const googleCalendarCredential = {
  id: 1,
  type: "google_calendar",
  key: {},
  userId: 1,
  user: { email: "u@test.com" },
  teamId: null,
  appId: "google-calendar",
  invalid: false,
  delegatedTo: null,
  delegationCredentialId: null,
  encryptedKey: null,
};

const zoomVideoCredential = {
  id: 2,
  type: "zoom_video",
  key: {},
  userId: 1,
  user: { email: "u@test.com" },
  teamId: null,
  appId: "zoom",
  invalid: false,
  delegatedTo: null,
  delegationCredentialId: null,
  encryptedKey: null,
};

describe("EventManager create / reschedule / delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateEvent.mockResolvedValue({
      type: "google_calendar",
      createdEvent: { id: "cal-1" },
      originalEvent: minimalCalEvent(),
    });
    mockCreateMeeting.mockResolvedValue({
      type: "zoom_video",
      createdEvent: { id: "vid-1", url: "https://zoom.us/j/1", password: null },
      originalEvent: minimalCalEvent(),
    });
    mockUpdateEvent.mockResolvedValue({ type: "google_calendar", updatedEvent: { id: "cal-1" } });
    mockUpdateMeeting.mockResolvedValue({ type: "zoom_video", updatedEvent: { id: "vid-1" } });
    mockDeleteEvent.mockResolvedValue({});
    mockDeleteMeeting.mockResolvedValue({});
  });

  describe("deleteCalendarEventForBookingReference", () => {
    it("calls deleteEvent when reference is calendar type and credential is present", async () => {
      const eventManager = new EventManager(
        {
          credentials: [googleCalendarCredential],
          destinationCalendar: null,
        },
        {}
      );
      const evt = minimalCalEvent();
      const reference = {
        type: "google_calendar",
        uid: "cal-1",
        credentialId: 1,
        externalCalendarId: "ext-1",
      };

      await (eventManager as any).deleteCalendarEventForBookingReference({
        reference,
        event: evt,
        isBookingInRecurringSeries: false,
      });

      expect(mockDeleteEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          credential: expect.objectContaining({ id: 1, type: "google_calendar" }),
          bookingRefUid: "cal-1",
          externalCalendarId: "ext-1",
        })
      );
    });

    it("calls deleteMeeting when reference is video type and credential is present", async () => {
      const eventManager = new EventManager(
        {
          credentials: [zoomVideoCredential],
          destinationCalendar: null,
        },
        {}
      );
      const reference = {
        type: "zoom_video",
        uid: "vid-1",
        credentialId: 2,
        meetingId: "vid-1",
      };

      await (eventManager as any).deleteVideoEventForBookingReference({
        reference,
      });

      expect(mockDeleteMeeting).toHaveBeenCalledWith(
        expect.objectContaining({ id: 2, type: "zoom_video" }),
        "vid-1"
      );
    });
  });
});

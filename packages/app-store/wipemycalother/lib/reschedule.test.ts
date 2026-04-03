/**
 * NOTE: The dynamic import of ./reschedule triggers @calcom/prisma loading, which initializes
 * prismock via the factory in __mocks__/prisma.ts. We call enableEmailFeature/mockNoTranslations
 * after the dynamic import so prismock is available.
 */
// biome-ignore lint/nursery/noImportCycles: Mock imports must come first for vitest mocking to work
import prismaMock from "@calcom/testing/lib/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Capture builder.init() calls to verify organizationId is passed
const mockBuilderInit = vi.fn();
const mockCalendarEvent = {};

vi.mock("@calcom/lib/builders/CalendarEvent/builder", () => {
  return {
    CalendarEventBuilder: class {
      calendarEvent = mockCalendarEvent;
      rescheduleLink = "https://cal.com/reschedule/uid-123";
      init(...args: unknown[]) {
        mockBuilderInit(...args);
      }
    },
  };
});

vi.mock("@calcom/lib/builders/CalendarEvent/director", () => {
  return {
    CalendarEventDirector: class {
      setBuilder() {}
      setExistingBooking() {}
      setCancellationReason() {}
      buildForRescheduleEmail() {
        return Promise.resolve();
      }
    },
  };
});

const mockSendRequestRescheduleEmailAndSMS = vi.fn(() => Promise.resolve());
vi.mock("@calcom/emails/email-manager", () => ({
  sendRequestRescheduleEmailAndSMS: (...args: unknown[]) => mockSendRequestRescheduleEmailAndSMS(...args),
}));

vi.mock("@calcom/features/conferencing/lib/videoClient", () => ({
  deleteMeeting: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../_utils/getCalendar", () => ({
  getCalendar: vi.fn(),
}));

import { BookingStatus } from "@calcom/prisma/enums";
import {
  createBookingScenario,
  enableEmailFeature,
  getOrganizer,
  getScenarioData,
  mockNoTranslations,
  TestData,
  getDate,
} from "@calcom/testing/lib/bookingScenario/bookingScenario";

describe("wipemycalother Reschedule", () => {
  beforeEach(() => {
    vi.stubEnv("CALENDSO_ENCRYPTION_KEY", "abcdefghjnmkljhjklmnhjklkmnbhjui");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "MOCK_STRIPE_WEBHOOK_SECRET");
    vi.stubEnv("CALCOM_KEYRING_SMTP_CURRENT", "K1");
    vi.stubEnv("CALCOM_KEYRING_SMTP_K1", "RNvJaRNaRGhIZGRHQY_l-i6TjEauPNWQ2qL6Xehe_XI");
    vi.stubEnv("UNKEY_ROOT_KEY", "");
    vi.clearAllMocks();
    globalThis.testEmails = [];
    fetchMock.resetMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.testEmails = [];
    fetchMock.resetMocks();
  });

  describe("organizationId on CalendarEventBuilder", () => {
    it("should pass organizationId from user profile to builder.init()", async () => {
      // Dynamic import triggers @calcom/prisma → prismock initialization
      const { default: Reschedule } = await import("./reschedule");

      // Now prismock is initialized, set up scenario
      enableEmailFeature();
      mockNoTranslations();

      const ORG_ID = 42;
      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@test.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData(
          {
            organizer,
            eventTypes: [
              {
                id: 1,
                slotInterval: 30,
                length: 30,
                users: [{ id: 101 }],
              },
            ],
            bookings: [
              {
                uid: "uid-123",
                eventTypeId: 1,
                userId: 101,
                status: BookingStatus.ACCEPTED,
                startTime: `${plus1DateString}T10:00:00.000Z`,
                endTime: `${plus1DateString}T11:00:00.000Z`,
                attendees: [{ email: "attendee@test.com", timeZone: "UTC" }],
                user: { id: 101 },
              },
            ],
          },
          { id: ORG_ID }
        )
      );

      await Reschedule("uid-123", "Conflicting meeting");

      expect(mockBuilderInit).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: ORG_ID,
        })
      );
    });

    it("should pass organizationId as null when user has no org profile", async () => {
      const { default: Reschedule } = await import("./reschedule");

      enableEmailFeature();
      mockNoTranslations();

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@test.com",
        id: 101,
        schedules: [TestData.schedules.IstWorkHours],
      });

      const { dateString: plus1DateString } = getDate({ dateIncrement: 1 });

      await createBookingScenario(
        getScenarioData({
          organizer,
          eventTypes: [
            {
              id: 1,
              slotInterval: 30,
              length: 30,
              users: [{ id: 101 }],
            },
          ],
          bookings: [
            {
              uid: "uid-456",
              eventTypeId: 1,
              userId: 101,
              status: BookingStatus.ACCEPTED,
              startTime: `${plus1DateString}T10:00:00.000Z`,
              endTime: `${plus1DateString}T11:00:00.000Z`,
              attendees: [{ email: "attendee@test.com", timeZone: "UTC" }],
              user: { id: 101 },
            },
          ],
        })
      );

      await Reschedule("uid-456", "Conflicting meeting");

      expect(mockBuilderInit).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: null,
        })
      );
    });
  });
});

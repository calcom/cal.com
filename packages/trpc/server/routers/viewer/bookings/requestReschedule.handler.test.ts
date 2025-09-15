import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";
import dayjs from "@calcom/dayjs";
import { sendRequestRescheduleEmailAndSMS } from "@calcom/emails";
import { deleteWebhookScheduledTriggers } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";
import { BookingWebhookFactory } from "@calcom/lib/server/service/BookingWebhookFactory";
import { deleteMeeting } from "@calcom/lib/videoClient";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { requestRescheduleHandler } from "./requestReschedule.handler";

// Mock all external dependencies
vi.mock("@calcom/prisma", () => ({
  prisma: {
    booking: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUniqueOrThrow: vi.fn(),
    },
    eventType: {
      findUniqueOrThrow: vi.fn(),
    },
    attendee: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@calcom/emails", () => ({
  sendRequestRescheduleEmailAndSMS: vi.fn(),
}));

vi.mock("@calcom/features/webhooks/lib/scheduleTrigger", () => ({
  deleteWebhookScheduledTriggers: vi.fn(),
}));

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@calcom/lib/server/repository/workflow", () => ({
  WorkflowRepository: {
    deleteAllWorkflowReminders: vi.fn(),
  },
}));

vi.mock("@calcom/lib/server/service/BookingWebhookFactory", () => ({
  BookingWebhookFactory: vi.fn().mockImplementation(() => ({
    buildEventPayloadFromBooking: vi.fn().mockResolvedValue({}),
    create: vi.fn(),
  })),
}));

vi.mock("@calcom/lib/videoClient", () => ({
  deleteMeeting: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("@calcom/lib/server/getUsersCredentials", () => ({
  getUsersCredentialsIncludeServiceAccountKey: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/lib/delegationCredential/server", () => ({
  getDelegationCredentialOrRegularCredential: vi.fn(),
}));

vi.mock("@calcom/app-store/_utils/getCalendar", () => ({
  getCalendar: vi.fn(),
}));

vi.mock("@calcom/lib/getBookerUrl/server", () => ({
  getBookerBaseUrl: vi.fn().mockResolvedValue("https://cal.com"),
}));

vi.mock("@calcom/lib/getOrgIdFromMemberOrTeamId", () => ({
  default: vi.fn().mockResolvedValue(null),
}));

vi.mock("@calcom/lib/getTeamIdFromEventType", () => ({
  getTeamIdFromEventType: vi.fn().mockResolvedValue(null),
}));

describe("requestRescheduleHandler - API Validation", () => {
  const mockUser = {
    id: 1,
    email: "user@example.com",
    locale: "en",
    name: "Test User",
    username: "testuser",
    timeZone: "America/New_York",
    profile: {
      organizationId: null,
    },
  };

  const createMockBooking = (overrides = {}) => ({
    id: 1,
    uid: "booking-uid",
    userId: 1,
    title: "Test Meeting",
    description: "Test Description",
    startTime: dayjs().add(24, "hours").toDate(),
    endTime: dayjs().add(24, "hours").add(30, "minutes").toDate(),
    eventTypeId: 1,
    userPrimaryEmail: "user@example.com",
    eventType: {
      id: 1,
      teamId: null,
      team: null,
      minimumCancellationNotice: 0,
      bookingFields: null,
      hideOrganizerEmail: false,
      parentId: null,
    },
    location: "Zoom",
    attendees: [
      {
        id: 1,
        email: "attendee@example.com",
        name: "Attendee Name",
        locale: "en",
        timeZone: "America/New_York",
        phoneNumber: null,
      },
    ],
    references: [],
    customInputs: {},
    dynamicEventSlugRef: null,
    dynamicGroupSlugRef: null,
    destinationCalendar: null,
    smsReminderNumber: null,
    workflowReminders: [],
    responses: {},
    iCalUID: "ical-uid",
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("API returns 403 with minimum cancellation notice validation", () => {
    it("should return 403 when reschedule attempt is within minimum notice period", async () => {
      const bookingWithMinNotice = createMockBooking({
        startTime: dayjs().add(6, "hours").toDate(), // Booking in 6 hours
        endTime: dayjs().add(6, "hours").add(30, "minutes").toDate(),
        eventType: {
          id: 1,
          teamId: null,
          team: null,
          minimumCancellationNotice: 720, // 12 hours minimum notice
          bookingFields: null,
          hideOrganizerEmail: false,
          parentId: null,
        },
      });

      vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(bookingWithMinNotice as any);

      await expect(
        requestRescheduleHandler({
          ctx: { user: mockUser as any },
          input: {
            bookingId: "booking-uid",
            rescheduleReason: "Need to reschedule",
          },
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        requestRescheduleHandler({
          ctx: { user: mockUser as any },
          input: {
            bookingId: "booking-uid",
            rescheduleReason: "Need to reschedule",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Cannot reschedule within 12 hours of event start",
      });

      // Verify no database updates occurred
      expect(prisma.booking.update).not.toHaveBeenCalled();
      expect(sendRequestRescheduleEmailAndSMS).not.toHaveBeenCalled();
      expect(deleteWebhookScheduledTriggers).not.toHaveBeenCalled();
      expect(WorkflowRepository.deleteAllWorkflowReminders).not.toHaveBeenCalled();
    });

    it("should return 403 with proper error message for various time periods", async () => {
      const testCases = [
        {
          minutesNotice: 30,
          minutesUntilEvent: 15,
          expectedMessage: "Cannot reschedule within 30 minutes of event start",
        },
        {
          minutesNotice: 60,
          minutesUntilEvent: 45,
          expectedMessage: "Cannot reschedule within 1 hour of event start",
        },
        {
          minutesNotice: 90,
          minutesUntilEvent: 60,
          expectedMessage: "Cannot reschedule within 1 hour and 30 minutes of event start",
        },
        {
          minutesNotice: 120,
          minutesUntilEvent: 100,
          expectedMessage: "Cannot reschedule within 2 hours of event start",
        },
        {
          minutesNotice: 1440,
          minutesUntilEvent: 720,
          expectedMessage: "Cannot reschedule within 24 hours of event start",
        },
        {
          minutesNotice: 2880,
          minutesUntilEvent: 1440,
          expectedMessage: "Cannot reschedule within 48 hours of event start",
        },
        {
          minutesNotice: 4320,
          minutesUntilEvent: 2880,
          expectedMessage: "Cannot reschedule within 72 hours of event start",
        },
      ];

      for (const testCase of testCases) {
        const booking = createMockBooking({
          startTime: dayjs().add(testCase.minutesUntilEvent, "minutes").toDate(),
          endTime: dayjs().add(testCase.minutesUntilEvent + 30, "minutes").toDate(),
          eventType: {
            id: 1,
            teamId: null,
            team: null,
            minimumCancellationNotice: testCase.minutesNotice,
            bookingFields: null,
            hideOrganizerEmail: false,
            parentId: null,
          },
        });

        vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(booking as any);

        await expect(
          requestRescheduleHandler({
            ctx: { user: mockUser as any },
            input: {
              bookingId: "booking-uid",
              rescheduleReason: "Need to reschedule",
            },
          })
        ).rejects.toMatchObject({
          code: "FORBIDDEN",
          message: testCase.expectedMessage,
        });
      }
    });

    it("should handle edge case: reschedule attempt exactly at minimum notice boundary", async () => {
      const minutesNotice = 120; // 2 hours
      const booking = createMockBooking({
        startTime: dayjs().add(minutesNotice, "minutes").toDate(), // Exactly at boundary
        endTime: dayjs().add(minutesNotice + 30, "minutes").toDate(),
        eventType: {
          id: 1,
          teamId: null,
          team: null,
          minimumCancellationNotice: minutesNotice,
          bookingFields: null,
          hideOrganizerEmail: false,
          parentId: null,
        },
      });

      vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(booking as any);
      vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ teams: [] } as any);
      vi.mocked(prisma.eventType.findUniqueOrThrow).mockResolvedValue({
        title: "Event Type",
        schedulingType: null,
        recurringEvent: null,
      } as any);

      // Should allow reschedule when exactly at boundary (not within)
      const result = await requestRescheduleHandler({
        ctx: { user: mockUser as any },
        input: {
          bookingId: "booking-uid",
          rescheduleReason: "Need to reschedule",
        },
      });

      expect(result).toEqual({ message: "Booking rescheduled successfully" });
      expect(prisma.booking.update).toHaveBeenCalled();
    });

    it("should calculate time correctly across time zones", async () => {
      // Set system time to UTC
      vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
      
      const booking = createMockBooking({
        // Event is at 3 AM UTC (3 hours from now)
        startTime: new Date("2024-01-01T03:00:00Z"),
        endTime: new Date("2024-01-01T03:30:00Z"),
        eventType: {
          id: 1,
          teamId: null,
          team: null,
          minimumCancellationNotice: 240, // 4 hours minimum notice
          bookingFields: null,
          hideOrganizerEmail: false,
          parentId: null,
        },
      });

      vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(booking as any);

      // Should reject because 3 hours < 4 hours minimum notice
      await expect(
        requestRescheduleHandler({
          ctx: { user: mockUser as any },
          input: {
            bookingId: "booking-uid",
            rescheduleReason: "Need to reschedule",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Cannot reschedule within 4 hours of event start",
      });
    });

    it("should allow reschedule when no minimum notice is configured", async () => {
      const booking = createMockBooking({
        startTime: dayjs().add(5, "minutes").toDate(), // Very soon
        endTime: dayjs().add(35, "minutes").toDate(),
        eventType: {
          id: 1,
          teamId: null,
          team: null,
          minimumCancellationNotice: 0, // No minimum notice
          bookingFields: null,
          hideOrganizerEmail: false,
          parentId: null,
        },
      });

      vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(booking as any);
      vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ teams: [] } as any);
      vi.mocked(prisma.eventType.findUniqueOrThrow).mockResolvedValue({
        title: "Event Type",
        schedulingType: null,
        recurringEvent: null,
      } as any);

      const result = await requestRescheduleHandler({
        ctx: { user: mockUser as any },
        input: {
          bookingId: "booking-uid",
          rescheduleReason: "Last minute change",
        },
      });

      expect(result).toEqual({ message: "Booking rescheduled successfully" });
      expect(prisma.booking.update).toHaveBeenCalled();
    });

    it("should handle undefined minimumCancellationNotice gracefully", async () => {
      const booking = createMockBooking({
        startTime: dayjs().add(5, "minutes").toDate(),
        endTime: dayjs().add(35, "minutes").toDate(),
        eventType: {
          id: 1,
          teamId: null,
          team: null,
          minimumCancellationNotice: undefined, // Undefined
          bookingFields: null,
          hideOrganizerEmail: false,
          parentId: null,
        },
      });

      vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(booking as any);
      vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ teams: [] } as any);
      vi.mocked(prisma.eventType.findUniqueOrThrow).mockResolvedValue({
        title: "Event Type",
        schedulingType: null,
        recurringEvent: null,
      } as any);

      const result = await requestRescheduleHandler({
        ctx: { user: mockUser as any },
        input: {
          bookingId: "booking-uid",
          rescheduleReason: "Last minute change",
        },
      });

      expect(result).toEqual({ message: "Booking rescheduled successfully" });
    });

    it("should handle null eventType gracefully", async () => {
      const booking = createMockBooking({
        startTime: dayjs().add(5, "minutes").toDate(),
        endTime: dayjs().add(35, "minutes").toDate(),
        eventType: null,
        dynamicEventSlugRef: "dynamic-event", // Has dynamic event instead
      });

      vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(booking as any);
      vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ teams: [] } as any);

      const result = await requestRescheduleHandler({
        ctx: { user: mockUser as any },
        input: {
          bookingId: "booking-uid",
          rescheduleReason: "Need to reschedule",
        },
      });

      expect(result).toEqual({ message: "Booking rescheduled successfully" });
    });

    it("should enforce minimum notice for team bookings", async () => {
      const teamBooking = createMockBooking({
        startTime: dayjs().add(2, "hours").toDate(),
        endTime: dayjs().add(2, "hours").add(30, "minutes").toDate(),
        eventType: {
          id: 1,
          teamId: 123,
          team: {
            id: 123,
            name: "Test Team",
            parentId: null,
          },
          minimumCancellationNotice: 180, // 3 hours
          bookingFields: null,
          hideOrganizerEmail: false,
          parentId: null,
        },
      });

      vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(teamBooking as any);
      vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({
        teams: [{ teamId: 123 }], // User is a team member
      } as any);

      await expect(
        requestRescheduleHandler({
          ctx: { user: mockUser as any },
          input: {
            bookingId: "booking-uid",
            rescheduleReason: "Team reschedule",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Cannot reschedule within 3 hours of event start",
      });
    });

    it("should check minimum notice before checking team membership", async () => {
      const teamBooking = createMockBooking({
        startTime: dayjs().add(1, "hour").toDate(),
        endTime: dayjs().add(1, "hour").add(30, "minutes").toDate(),
        eventType: {
          id: 1,
          teamId: 123,
          team: {
            id: 123,
            name: "Test Team",
            parentId: null,
          },
          minimumCancellationNotice: 120, // 2 hours
          bookingFields: null,
          hideOrganizerEmail: false,
          parentId: null,
        },
      });

      vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(teamBooking as any);
      
      // User is NOT a team member, but should get minimum notice error first
      vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({
        teams: [{ teamId: 456 }], // Different team
      } as any);

      await expect(
        requestRescheduleHandler({
          ctx: { user: mockUser as any },
          input: {
            bookingId: "booking-uid",
            rescheduleReason: "Need to reschedule",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Cannot reschedule within 2 hours of event start",
      });

      // Verify user.findUniqueOrThrow was never called (minimum notice check happens first)
      expect(prisma.user.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it("should handle past bookings with minimum notice", async () => {
      const pastBooking = createMockBooking({
        startTime: dayjs().subtract(1, "hour").toDate(), // Already past
        endTime: dayjs().subtract(30, "minutes").toDate(),
        eventType: {
          id: 1,
          teamId: null,
          team: null,
          minimumCancellationNotice: 60,
          bookingFields: null,
          hideOrganizerEmail: false,
          parentId: null,
        },
      });

      vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(pastBooking as any);

      await expect(
        requestRescheduleHandler({
          ctx: { user: mockUser as any },
          input: {
            bookingId: "booking-uid",
            rescheduleReason: "Trying to reschedule past event",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Cannot reschedule within 1 hour of event start",
      });
    });

    it("should handle very large minimum notice periods", async () => {
      const booking = createMockBooking({
        startTime: dayjs().add(7, "days").toDate(),
        endTime: dayjs().add(7, "days").add(30, "minutes").toDate(),
        eventType: {
          id: 1,
          teamId: null,
          team: null,
          minimumCancellationNotice: 20160, // 14 days (336 hours)
          bookingFields: null,
          hideOrganizerEmail: false,
          parentId: null,
        },
      });

      vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(booking as any);

      await expect(
        requestRescheduleHandler({
          ctx: { user: mockUser as any },
          input: {
            bookingId: "booking-uid",
            rescheduleReason: "Need to reschedule",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Cannot reschedule within 336 hours of event start",
      });
    });

    it("should handle plural forms correctly in error messages", async () => {
      const testCases = [
        { minutes: 1, expected: "1 minute" },
        { minutes: 2, expected: "2 minutes" },
        { minutes: 59, expected: "59 minutes" },
        { minutes: 61, expected: "1 hour and 1 minute" },
        { minutes: 62, expected: "1 hour and 2 minutes" },
        { minutes: 119, expected: "1 hour and 59 minutes" },
        { minutes: 121, expected: "2 hours and 1 minute" },
        { minutes: 122, expected: "2 hours and 2 minutes" },
      ];

      for (const testCase of testCases) {
        const booking = createMockBooking({
          startTime: dayjs().add(testCase.minutes - 1, "minutes").toDate(),
          endTime: dayjs().add(testCase.minutes + 29, "minutes").toDate(),
          eventType: {
            id: 1,
            teamId: null,
            team: null,
            minimumCancellationNotice: testCase.minutes,
            bookingFields: null,
            hideOrganizerEmail: false,
            parentId: null,
          },
        });

        vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(booking as any);

        await expect(
          requestRescheduleHandler({
            ctx: { user: mockUser as any },
            input: {
              bookingId: "booking-uid",
              rescheduleReason: "Testing plural forms",
            },
          })
        ).rejects.toMatchObject({
          code: "FORBIDDEN",
          message: `Cannot reschedule within ${testCase.expected} of event start`,
        });
      }
    });
  });

  describe("Integration with other booking validations", () => {
    it("should validate minimum notice before other booking validations", async () => {
      const booking = createMockBooking({
        userId: null, // This would normally cause "doesn't have an owner" error
        startTime: dayjs().add(1, "hour").toDate(),
        endTime: dayjs().add(1, "hour").add(30, "minutes").toDate(),
        eventType: {
          id: 1,
          teamId: null,
          team: null,
          minimumCancellationNotice: 120, // 2 hours
          bookingFields: null,
          hideOrganizerEmail: false,
          parentId: null,
        },
      });

      vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(booking as any);

      // Should get minimum notice error, not the "doesn't have an owner" error
      await expect(
        requestRescheduleHandler({
          ctx: { user: mockUser as any },
          input: {
            bookingId: "booking-uid",
            rescheduleReason: "Testing validation order",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Cannot reschedule within 2 hours of event start",
      });
    });

    it("should handle cancelled bookings correctly", async () => {
      // This should be caught by the findUniqueOrThrow query's WHERE clause
      vi.mocked(prisma.booking.findUniqueOrThrow).mockRejectedValue(
        new Error("No Booking found")
      );

      await expect(
        requestRescheduleHandler({
          ctx: { user: mockUser as any },
          input: {
            bookingId: "cancelled-booking-uid",
            rescheduleReason: "Trying to reschedule cancelled booking",
          },
        })
      ).rejects.toThrow("No Booking found");
    });

    it("should handle rejected bookings correctly", async () => {
      // This should be caught by the findUniqueOrThrow query's WHERE clause
      vi.mocked(prisma.booking.findUniqueOrThrow).mockRejectedValue(
        new Error("No Booking found")
      );

      await expect(
        requestRescheduleHandler({
          ctx: { user: mockUser as any },
          input: {
            bookingId: "rejected-booking-uid",
            rescheduleReason: "Trying to reschedule rejected booking",
          },
        })
      ).rejects.toThrow("No Booking found");
    });
  });

  describe("Successful reschedule scenarios", () => {
    it("should successfully reschedule when outside minimum notice period", async () => {
      const booking = createMockBooking({
        startTime: dayjs().add(25, "hours").toDate(),
        endTime: dayjs().add(25, "hours").add(30, "minutes").toDate(),
        eventType: {
          id: 1,
          teamId: null,
          team: null,
          minimumCancellationNotice: 1440, // 24 hours
          bookingFields: null,
          hideOrganizerEmail: false,
          parentId: null,
        },
      });

      vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(booking as any);
      vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ teams: [] } as any);
      vi.mocked(prisma.eventType.findUniqueOrThrow).mockResolvedValue({
        title: "Event Type",
        schedulingType: null,
        recurringEvent: null,
      } as any);

      const result = await requestRescheduleHandler({
        ctx: { user: mockUser as any },
        input: {
          bookingId: "booking-uid",
          rescheduleReason: "Valid reschedule request",
        },
      });

      expect(result).toEqual({ message: "Booking rescheduled successfully" });
      
      // Verify all expected side effects occurred
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          rescheduled: true,
          cancellationReason: "Valid reschedule request",
          status: BookingStatus.CANCELLED,
          updatedAt: expect.any(String),
          cancelledBy: "user@example.com",
        },
      });
      
      expect(deleteWebhookScheduledTriggers).toHaveBeenCalled();
      expect(WorkflowRepository.deleteAllWorkflowReminders).toHaveBeenCalled();
      expect(sendRequestRescheduleEmailAndSMS).toHaveBeenCalled();
    });

    it("should reschedule successfully with seat-based events", async () => {
      const seatBooking = createMockBooking({
        startTime: dayjs().add(48, "hours").toDate(),
        endTime: dayjs().add(48, "hours").add(30, "minutes").toDate(),
        eventType: {
          id: 1,
          teamId: null,
          team: null,
          minimumCancellationNotice: 1440, // 24 hours
          seatsPerTimeSlot: 10,
          bookingFields: null,
          hideOrganizerEmail: false,
          parentId: null,
        },
        attendees: [
          {
            id: 1,
            email: "user@example.com", // Current user's email
            name: "Current User",
            locale: "en",
            timeZone: "America/New_York",
            phoneNumber: null,
          },
          {
            id: 2,
            email: "newattendee@example.com",
            name: "New Attendee",
            locale: "en",
            timeZone: "America/New_York",
            phoneNumber: null,
          },
        ],
      });

      vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(seatBooking as any);
      vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ teams: [] } as any);
      vi.mocked(prisma.eventType.findUniqueOrThrow).mockResolvedValue({
        title: "Event Type",
        schedulingType: null,
        recurringEvent: null,
      } as any);

      const result = await requestRescheduleHandler({
        ctx: { user: mockUser as any },
        input: {
          bookingId: "booking-uid",
          rescheduleReason: "Need to reschedule",
        },
      });

      expect(result).toEqual({ message: "Booking rescheduled successfully" });
      expect(prisma.attendee.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: "New Attendee",
          email: "newattendee@example.com",
        },
      });
    });
  });
});
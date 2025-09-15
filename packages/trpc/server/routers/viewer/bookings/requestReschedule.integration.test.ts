import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { createCallerFactory } from "@calcom/trpc/server";
import { appRouter } from "@calcom/trpc/server/routers/_app";
import dayjs from "@calcom/dayjs";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

// Mock prisma to avoid database calls
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

// Mock email service
vi.mock("@calcom/emails", () => ({
  sendRequestRescheduleEmailAndSMS: vi.fn(),
}));

// Mock webhook service
vi.mock("@calcom/features/webhooks/lib/scheduleTrigger", () => ({
  deleteWebhookScheduledTriggers: vi.fn(),
}));

// Mock workflow repository
vi.mock("@calcom/lib/server/repository/workflow", () => ({
  WorkflowRepository: {
    deleteAllWorkflowReminders: vi.fn(),
  },
}));

// Mock booking webhook factory
vi.mock("@calcom/lib/server/service/BookingWebhookFactory", () => ({
  BookingWebhookFactory: vi.fn().mockImplementation(() => ({
    buildEventPayloadFromBooking: vi.fn().mockResolvedValue({}),
    create: vi.fn(),
  })),
}));

// Mock other services
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

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@calcom/lib/getOrgIdFromMemberOrTeamId", () => ({
  default: vi.fn().mockResolvedValue(null),
}));

vi.mock("@calcom/lib/getTeamIdFromEventType", () => ({
  getTeamIdFromEventType: vi.fn().mockResolvedValue(null),
}));

describe("Request Reschedule API Integration Tests", () => {
  const createCaller = createCallerFactory(appRouter);
  
  const mockUser = {
    id: 1,
    email: "user@example.com",
    username: "testuser",
    name: "Test User",
    locale: "en",
    timeZone: "America/New_York",
    profile: {
      organizationId: null,
    },
  };

  const createMockContext = (user = mockUser) => ({
    user,
    session: {
      user,
      expires: dayjs().add(1, "day").toISOString(),
    },
    prisma,
  });

  const createMockBooking = (overrides = {}) => ({
    id: 1,
    uid: "booking-uid-123",
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

  describe("API 403 Error Response", () => {
    it("should return 403 error via TRPC when reschedule is within minimum notice", async () => {
      const booking = createMockBooking({
        startTime: dayjs().add(3, "hours").toDate(),
        endTime: dayjs().add(3, "hours").add(30, "minutes").toDate(),
        eventType: {
          id: 1,
          teamId: null,
          team: null,
          minimumCancellationNotice: 360, // 6 hours minimum notice
          bookingFields: null,
          hideOrganizerEmail: false,
          parentId: null,
        },
      });

      vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(booking as any);

      const caller = createCaller(createMockContext() as any);

      await expect(
        caller.viewer.bookings.requestReschedule({
          bookingId: "booking-uid-123",
          rescheduleReason: "Need to reschedule",
        })
      ).rejects.toThrow(TRPCError);

      try {
        await caller.viewer.bookings.requestReschedule({
          bookingId: "booking-uid-123",
          rescheduleReason: "Need to reschedule",
        });
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("FORBIDDEN");
        expect((error as TRPCError).message).toBe("Cannot reschedule within 6 hours of event start");
      }
    });

    it("should return properly formatted error messages for different time periods", async () => {
      const testCases = [
        {
          minutesNotice: 45,
          minutesUntilEvent: 30,
          expectedMessage: "Cannot reschedule within 45 minutes of event start",
        },
        {
          minutesNotice: 90,
          minutesUntilEvent: 60,
          expectedMessage: "Cannot reschedule within 1 hour and 30 minutes of event start",
        },
        {
          minutesNotice: 240,
          minutesUntilEvent: 180,
          expectedMessage: "Cannot reschedule within 4 hours of event start",
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
      ];

      const caller = createCaller(createMockContext() as any);

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

        try {
          await caller.viewer.bookings.requestReschedule({
            bookingId: "booking-uid-123",
            rescheduleReason: "Testing error messages",
          });
          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toBeInstanceOf(TRPCError);
          expect((error as TRPCError).code).toBe("FORBIDDEN");
          expect((error as TRPCError).message).toBe(testCase.expectedMessage);
        }
      }
    });

    it("should validate minimum notice for team bookings", async () => {
      const teamBooking = createMockBooking({
        startTime: dayjs().add(90, "minutes").toDate(),
        endTime: dayjs().add(120, "minutes").toDate(),
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
      vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({
        teams: [{ teamId: 123 }], // User is a team member
      } as any);

      const caller = createCaller(createMockContext() as any);

      try {
        await caller.viewer.bookings.requestReschedule({
          bookingId: "booking-uid-123",
          rescheduleReason: "Team reschedule attempt",
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("FORBIDDEN");
        expect((error as TRPCError).message).toBe("Cannot reschedule within 2 hours of event start");
      }
    });

    it("should handle past events correctly", async () => {
      const pastBooking = createMockBooking({
        startTime: dayjs().subtract(2, "hours").toDate(), // Event already started
        endTime: dayjs().subtract(1, "hour").toDate(),
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

      const caller = createCaller(createMockContext() as any);

      try {
        await caller.viewer.bookings.requestReschedule({
          bookingId: "booking-uid-123",
          rescheduleReason: "Trying to reschedule past event",
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("FORBIDDEN");
        expect((error as TRPCError).message).toBe("Cannot reschedule within 1 hour of event start");
      }
    });

    it("should handle events at exact boundary correctly", async () => {
      const minutesNotice = 180; // 3 hours
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

      const caller = createCaller(createMockContext() as any);

      // Should succeed when exactly at boundary
      const result = await caller.viewer.bookings.requestReschedule({
        bookingId: "booking-uid-123",
        rescheduleReason: "Reschedule at boundary",
      });

      expect(result).toEqual({ message: "Booking rescheduled successfully" });
      expect(prisma.booking.update).toHaveBeenCalled();
    });
  });

  describe("Successful reschedule via API", () => {
    it("should successfully reschedule when outside minimum notice period", async () => {
      const booking = createMockBooking({
        startTime: dayjs().add(48, "hours").toDate(),
        endTime: dayjs().add(48, "hours").add(30, "minutes").toDate(),
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

      const caller = createCaller(createMockContext() as any);

      const result = await caller.viewer.bookings.requestReschedule({
        bookingId: "booking-uid-123",
        rescheduleReason: "Valid reschedule request",
      });

      expect(result).toEqual({ message: "Booking rescheduled successfully" });
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
    });

    it("should allow reschedule when no minimum notice is set", async () => {
      const booking = createMockBooking({
        startTime: dayjs().add(10, "minutes").toDate(), // Very close to event
        endTime: dayjs().add(40, "minutes").toDate(),
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

      const caller = createCaller(createMockContext() as any);

      const result = await caller.viewer.bookings.requestReschedule({
        bookingId: "booking-uid-123",
        rescheduleReason: "Last minute reschedule",
      });

      expect(result).toEqual({ message: "Booking rescheduled successfully" });
    });
  });

  describe("Error handling edge cases", () => {
    it("should handle database errors gracefully", async () => {
      vi.mocked(prisma.booking.findUniqueOrThrow).mockRejectedValue(
        new Error("Database connection failed")
      );

      const caller = createCaller(createMockContext() as any);

      await expect(
        caller.viewer.bookings.requestReschedule({
          bookingId: "booking-uid-123",
          rescheduleReason: "Test database error",
        })
      ).rejects.toThrow("Database connection failed");
    });

    it("should handle booking not found", async () => {
      vi.mocked(prisma.booking.findUniqueOrThrow).mockRejectedValue(
        new Error("No Booking found")
      );

      const caller = createCaller(createMockContext() as any);

      await expect(
        caller.viewer.bookings.requestReschedule({
          bookingId: "non-existent-booking",
          rescheduleReason: "Test not found",
        })
      ).rejects.toThrow("No Booking found");
    });

    it("should handle unauthorized user", async () => {
      const booking = createMockBooking({
        userId: 999, // Different user ID
      });

      vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(booking as any);
      vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ teams: [] } as any);

      const caller = createCaller(createMockContext() as any);

      try {
        await caller.viewer.bookings.requestReschedule({
          bookingId: "booking-uid-123",
          rescheduleReason: "Unauthorized attempt",
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("FORBIDDEN");
        expect((error as TRPCError).message).toBe("User isn't owner of the current booking");
      }
    });

    it("should validate input schema", async () => {
      const caller = createCaller(createMockContext() as any);

      // Test with missing bookingId
      await expect(
        caller.viewer.bookings.requestReschedule({
          bookingId: "",
          rescheduleReason: "Test empty booking ID",
        })
      ).rejects.toThrow();

      // Test with invalid input type
      await expect(
        caller.viewer.bookings.requestReschedule({
          bookingId: 123 as any, // Should be string
          rescheduleReason: "Test invalid type",
        })
      ).rejects.toThrow();
    });
  });

  describe("Complex scenarios", () => {
    it("should handle concurrent reschedule attempts", async () => {
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

      const caller = createCaller(createMockContext() as any);

      // Simulate concurrent requests
      const promises = [
        caller.viewer.bookings.requestReschedule({
          bookingId: "booking-uid-123",
          rescheduleReason: "Concurrent request 1",
        }),
        caller.viewer.bookings.requestReschedule({
          bookingId: "booking-uid-123",
          rescheduleReason: "Concurrent request 2",
        }),
      ];

      const results = await Promise.all(promises);
      
      // Both should succeed (in real scenario, database would handle concurrency)
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ message: "Booking rescheduled successfully" });
      expect(results[1]).toEqual({ message: "Booking rescheduled successfully" });
    });

    it("should handle time zone differences correctly", async () => {
      // Set system time to UTC midnight
      vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

      // Event at 2 AM UTC (2 hours from now)
      const booking = createMockBooking({
        startTime: new Date("2024-01-01T02:00:00Z"),
        endTime: new Date("2024-01-01T02:30:00Z"),
        eventType: {
          id: 1,
          teamId: null,
          team: null,
          minimumCancellationNotice: 180, // 3 hours minimum notice
          bookingFields: null,
          hideOrganizerEmail: false,
          parentId: null,
        },
      });

      vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(booking as any);

      // User in different timezone shouldn't affect calculation
      const userInDifferentTimezone = {
        ...mockUser,
        timeZone: "Asia/Tokyo", // UTC+9
      };

      const caller = createCaller(createMockContext(userInDifferentTimezone) as any);

      try {
        await caller.viewer.bookings.requestReschedule({
          bookingId: "booking-uid-123",
          rescheduleReason: "Timezone test",
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("FORBIDDEN");
        // 2 hours until event < 3 hours minimum notice
        expect((error as TRPCError).message).toBe("Cannot reschedule within 3 hours of event start");
      }
    });

    it("should handle dynamic event types correctly", async () => {
      const dynamicBooking = createMockBooking({
        startTime: dayjs().add(30, "minutes").toDate(),
        endTime: dayjs().add(60, "minutes").toDate(),
        eventType: null, // No event type
        eventTypeId: null,
        dynamicEventSlugRef: "dynamic-event-123", // Has dynamic event reference
      });

      vi.mocked(prisma.booking.findUniqueOrThrow).mockResolvedValue(dynamicBooking as any);
      vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ teams: [] } as any);

      const caller = createCaller(createMockContext() as any);

      // Should allow reschedule for dynamic events (no minimum notice check)
      const result = await caller.viewer.bookings.requestReschedule({
        bookingId: "booking-uid-123",
        rescheduleReason: "Dynamic event reschedule",
      });

      expect(result).toEqual({ message: "Booking rescheduled successfully" });
    });
  });
});
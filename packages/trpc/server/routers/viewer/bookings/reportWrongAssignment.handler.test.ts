import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reportWrongAssignmentHandler } from "./reportWrongAssignment.handler";

vi.mock("@calcom/features/bookings/repositories/BookingRepository");
vi.mock("@calcom/features/bookings/services/BookingAccessService");
vi.mock("@calcom/features/webhooks/lib/getWebhooks");
vi.mock("@calcom/features/webhooks/lib/sendPayload");
vi.mock("@calcom/prisma", () => ({ default: {} }));
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe("reportWrongAssignmentHandler", () => {
  const mockUser = {
    id: 1,
    email: "reporter@example.com",
    name: "Reporter User",
  };

  const mockBooking = {
    id: 100,
    uid: "test-booking-uid",
    title: "Test Booking",
    startTime: new Date("2025-12-01T10:00:00Z"),
    endTime: new Date("2025-12-01T11:00:00Z"),
    status: BookingStatus.ACCEPTED,
    user: {
      id: 2,
      email: "host@example.com",
      name: "Host User",
    },
    attendees: [{ email: "guest@example.com" }],
    eventType: {
      id: 10,
      title: "Test Event",
      slug: "test-event",
      teamId: 5,
    },
    assignmentReason: [{ reasonString: "Matched by round-robin" }],
  };

  const mockBookingRepo = {
    findByUidIncludeEventTypeAndTeamAndAssignmentReason: vi.fn(),
  };

  const mockBookingAccessService = {
    doesUserIdHaveAccessToBooking: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(BookingRepository).mockImplementation(function () {
      return mockBookingRepo;
    });
    vi.mocked(BookingAccessService).mockImplementation(function () {
      return mockBookingAccessService;
    });
    vi.mocked(getWebhooks).mockResolvedValue([]);
    vi.mocked(sendGenericWebhookPayload).mockResolvedValue({ ok: true, status: 200 });
  });

  describe("access control", () => {
    it("should throw FORBIDDEN when user doesn't have access to booking", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(false);

      await expect(
        reportWrongAssignmentHandler({
          ctx: { user: mockUser },
          input: {
            bookingUid: "test-booking-uid",
            additionalNotes: "This booking was assigned to me incorrectly",
          },
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        reportWrongAssignmentHandler({
          ctx: { user: mockUser },
          input: {
            bookingUid: "test-booking-uid",
            additionalNotes: "This booking was assigned to me incorrectly",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You don't have access to this booking",
      });
    });

    it("should throw NOT_FOUND when booking doesn't exist", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeEventTypeAndTeamAndAssignmentReason.mockResolvedValue(null);

      await expect(
        reportWrongAssignmentHandler({
          ctx: { user: mockUser },
          input: {
            bookingUid: "test-booking-uid",
            additionalNotes: "This booking was assigned to me incorrectly",
          },
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Booking not found",
      });
    });
  });

  describe("successful report", () => {
    it("should successfully report with all fields", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeEventTypeAndTeamAndAssignmentReason.mockResolvedValue(mockBooking);

      const result = await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          correctAssignee: "correct@example.com",
          additionalNotes: "This booking should have gone to the sales team",
        },
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Wrong assignment reported successfully");
    });

    it("should successfully report with only required fields (no correctAssignee)", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeEventTypeAndTeamAndAssignmentReason.mockResolvedValue(mockBooking);

      const result = await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          additionalNotes: "Wrong person received this booking",
        },
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Wrong assignment reported successfully");
    });
  });

  describe("webhook integration", () => {
    it("should send webhook with correct payload structure", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeEventTypeAndTeamAndAssignmentReason.mockResolvedValue(mockBooking);
      vi.mocked(getWebhooks).mockResolvedValue([
        { id: "webhook-1", subscriberUrl: "https://example.com/webhook", secret: "secret123" },
      ] as never);

      await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          correctAssignee: "correct@example.com",
          additionalNotes: "Wrong assignment notes",
        },
      });

      expect(getWebhooks).toHaveBeenCalledWith({
        userId: mockBooking.user.id,
        teamId: mockBooking.eventType.teamId,
        triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
      });

      expect(sendGenericWebhookPayload).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
          data: expect.objectContaining({
            booking: expect.objectContaining({
              uid: mockBooking.uid,
              id: mockBooking.id,
              title: mockBooking.title,
            }),
            report: expect.objectContaining({
              reportedBy: expect.objectContaining({
                id: mockUser.id,
                email: mockUser.email,
              }),
              routingReason: "Matched by round-robin",
              guest: "guest@example.com",
              host: expect.objectContaining({
                email: "host@example.com",
              }),
              correctAssignee: "correct@example.com",
              additionalNotes: "Wrong assignment notes",
            }),
          }),
        })
      );
    });

    it("should handle webhook failures gracefully", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeEventTypeAndTeamAndAssignmentReason.mockResolvedValue(mockBooking);
      vi.mocked(getWebhooks).mockResolvedValue([
        { id: "webhook-1", subscriberUrl: "https://example.com/webhook", secret: "secret123" },
      ] as never);
      vi.mocked(sendGenericWebhookPayload).mockRejectedValue(new Error("Webhook delivery failed"));

      const result = await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          additionalNotes: "Notes",
        },
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Wrong assignment reported successfully");
    });

    it("should not fail when getWebhooks throws", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeEventTypeAndTeamAndAssignmentReason.mockResolvedValue(mockBooking);
      vi.mocked(getWebhooks).mockRejectedValue(new Error("Database error"));

      const result = await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          additionalNotes: "Notes",
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle booking without assignmentReason", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeEventTypeAndTeamAndAssignmentReason.mockResolvedValue({
        ...mockBooking,
        assignmentReason: [],
      });
      vi.mocked(getWebhooks).mockResolvedValue([
        { id: "webhook-1", subscriberUrl: "https://example.com/webhook", secret: "secret123" },
      ] as never);

      await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          additionalNotes: "Notes",
        },
      });

      expect(sendGenericWebhookPayload).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            report: expect.objectContaining({
              routingReason: null,
            }),
          }),
        })
      );
    });

    it("should handle booking without user", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeEventTypeAndTeamAndAssignmentReason.mockResolvedValue({
        ...mockBooking,
        user: null,
      });

      const result = await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          additionalNotes: "Notes",
        },
      });

      expect(result.success).toBe(true);
      expect(getWebhooks).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
        })
      );
    });

    it("should handle booking without eventType", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeEventTypeAndTeamAndAssignmentReason.mockResolvedValue({
        ...mockBooking,
        eventType: null,
      });
      vi.mocked(getWebhooks).mockResolvedValue([
        { id: "webhook-1", subscriberUrl: "https://example.com/webhook", secret: "secret123" },
      ] as never);

      await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          additionalNotes: "Notes",
        },
      });

      expect(getWebhooks).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: null,
        })
      );
      expect(sendGenericWebhookPayload).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            booking: expect.objectContaining({
              eventType: null,
            }),
          }),
        })
      );
    });

    it("should handle booking without attendees", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeEventTypeAndTeamAndAssignmentReason.mockResolvedValue({
        ...mockBooking,
        attendees: [],
      });
      vi.mocked(getWebhooks).mockResolvedValue([
        { id: "webhook-1", subscriberUrl: "https://example.com/webhook", secret: "secret123" },
      ] as never);

      await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          additionalNotes: "Notes",
        },
      });

      expect(sendGenericWebhookPayload).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            report: expect.objectContaining({
              guest: "",
            }),
          }),
        })
      );
    });
  });
});

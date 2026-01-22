import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import { AssignmentReasonEnum, BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reportWrongAssignmentHandler } from "./reportWrongAssignment.handler";

const { mockTeamFindUnique } = vi.hoisted(() => ({
  mockTeamFindUnique: vi.fn(),
}));

vi.mock("@calcom/features/bookings/services/BookingAccessService");
vi.mock("@calcom/features/webhooks/lib/getWebhooks");
vi.mock("@calcom/features/webhooks/lib/sendPayload");
vi.mock("@calcom/prisma", () => ({
  default: {
    team: {
      findUnique: mockTeamFindUnique,
    },
  },
}));
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

  const mockInput = {
    bookingUid: "test-booking-uid",
    bookingId: 100,
    bookingTitle: "Test Booking",
    bookingStartTime: new Date("2025-12-01T10:00:00Z"),
    bookingEndTime: new Date("2025-12-01T11:00:00Z"),
    bookingStatus: BookingStatus.ACCEPTED,
    eventTypeId: 10,
    eventTypeTitle: "Test Event",
    eventTypeSlug: "test-event",
    teamId: 5,
    userId: 2,
    routingReason: "Matched by round-robin",
    routingReasonEnum: AssignmentReasonEnum.ROUND_ROBIN,
    guestEmail: "guest@example.com",
    hostEmail: "host@example.com",
    hostName: "Host User",
    additionalNotes: "This booking was assigned to me incorrectly",
  };

  const mockBookingAccessService = {
    doesUserIdHaveAccessToBooking: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(BookingAccessService).mockImplementation(function () {
      return mockBookingAccessService;
    });
    vi.mocked(getWebhooks).mockResolvedValue([]);
    vi.mocked(sendGenericWebhookPayload).mockResolvedValue({ ok: true, status: 200 });
    mockTeamFindUnique.mockResolvedValue({ parentId: 1 });
  });

  describe("access control", () => {
    it("should throw FORBIDDEN when user doesn't have access to booking", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(false);

      await expect(
        reportWrongAssignmentHandler({
          ctx: { user: mockUser },
          input: mockInput,
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        reportWrongAssignmentHandler({
          ctx: { user: mockUser },
          input: mockInput,
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You don't have access to this booking",
      });
    });
  });

  describe("successful report", () => {
    it("should successfully report with all fields", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);

      const result = await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          ...mockInput,
          correctAssignee: "correct@example.com",
          additionalNotes: "This booking should have gone to the sales team",
        },
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Wrong assignment reported successfully");
    });

    it("should successfully report with only required fields (no correctAssignee)", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);

      const result = await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          ...mockInput,
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
      vi.mocked(getWebhooks).mockResolvedValue([
        { id: "webhook-1", subscriberUrl: "https://example.com/webhook", secret: "secret123" },
      ] as never);

      await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          ...mockInput,
          correctAssignee: "correct@example.com",
          additionalNotes: "Wrong assignment notes",
        },
      });

      expect(getWebhooks).toHaveBeenCalledWith({
        userId: mockInput.userId,
        teamId: mockInput.teamId,
        orgId: 1,
        triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
      });

      expect(sendGenericWebhookPayload).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
          data: expect.objectContaining({
            booking: expect.objectContaining({
              uid: mockInput.bookingUid,
              id: mockInput.bookingId,
              title: mockInput.bookingTitle,
            }),
            report: expect.objectContaining({
              reportedBy: expect.objectContaining({
                id: mockUser.id,
                email: mockUser.email,
              }),
              routingReason: mockInput.routingReason,
              guest: mockInput.guestEmail,
              host: expect.objectContaining({
                email: mockInput.hostEmail,
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
      vi.mocked(getWebhooks).mockResolvedValue([
        { id: "webhook-1", subscriberUrl: "https://example.com/webhook", secret: "secret123" },
      ] as never);
      vi.mocked(sendGenericWebhookPayload).mockRejectedValue(new Error("Webhook delivery failed"));

      const result = await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: mockInput,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Wrong assignment reported successfully");
    });

    it("should not fail when getWebhooks throws", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      vi.mocked(getWebhooks).mockRejectedValue(new Error("Database error"));

      const result = await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: mockInput,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle booking without assignmentReason", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      vi.mocked(getWebhooks).mockResolvedValue([
        { id: "webhook-1", subscriberUrl: "https://example.com/webhook", secret: "secret123" },
      ] as never);

      await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          ...mockInput,
          routingReason: null,
          routingReasonEnum: null,
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

      const result = await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          ...mockInput,
          userId: null,
          hostEmail: "",
          hostName: null,
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
      mockTeamFindUnique.mockResolvedValue(null);
      vi.mocked(getWebhooks).mockResolvedValue([
        { id: "webhook-1", subscriberUrl: "https://example.com/webhook", secret: "secret123" },
      ] as never);

      await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          ...mockInput,
          eventTypeId: null,
          eventTypeTitle: null,
          eventTypeSlug: null,
          teamId: null,
        },
      });

      expect(getWebhooks).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: null,
          orgId: null,
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
      vi.mocked(getWebhooks).mockResolvedValue([
        { id: "webhook-1", subscriberUrl: "https://example.com/webhook", secret: "secret123" },
      ] as never);

      await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          ...mockInput,
          guestEmail: "",
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

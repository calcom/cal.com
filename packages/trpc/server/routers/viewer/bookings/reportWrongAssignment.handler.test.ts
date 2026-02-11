import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import { sendGenericWebhookPayload } from "@calcom/features/webhooks/lib/sendPayload";
import { ErrorWithCode } from "@calcom/lib/errors";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reportWrongAssignmentHandler } from "./reportWrongAssignment.handler";

const mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason = vi.fn();
const mockDoesUserIdHaveAccessToBooking = vi.fn();
const mockExistsByBookingUid = vi.fn();
const mockCreateReport = vi.fn();

vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => {
  return {
    BookingRepository: class MockBookingRepository {
      findByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason =
        mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason;
    },
  };
});
vi.mock("@calcom/features/bookings/repositories/WrongAssignmentReportRepository", () => {
  return {
    WrongAssignmentReportRepository: class MockWrongAssignmentReportRepository {
      existsByBookingUid = mockExistsByBookingUid;
      createReport = mockCreateReport;
    },
  };
});
vi.mock("@calcom/features/bookings/services/BookingAccessService", () => {
  return {
    BookingAccessService: class MockBookingAccessService {
      doesUserIdHaveAccessToBooking = mockDoesUserIdHaveAccessToBooking;
    },
  };
});
vi.mock("@calcom/features/ee/teams/repositories/TeamRepository", () => {
  return {
    TeamRepository: class MockTeamRepository {},
  };
});
vi.mock("@calcom/features/webhooks/lib/getWebhooks");
vi.mock("@calcom/features/webhooks/lib/sendPayload");
vi.mock("@calcom/prisma", () => ({
  default: {},
}));
vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => {
    const translations: Record<string, string> = {
      wrong_assignment_already_reported:
        "A wrong assignment report has already been submitted for this booking",
      wrong_assignment_reported: "Wrong assignment reported successfully",
    };
    return translations[key] || key;
  }),
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
    additionalNotes: "This booking was assigned to me incorrectly",
  };

  const mockBooking = {
    id: 100,
    uid: "test-booking-uid",
    title: "Test Booking",
    startTime: new Date("2025-12-01T10:00:00Z"),
    endTime: new Date("2025-12-01T11:00:00Z"),
    status: BookingStatus.ACCEPTED,
    userId: 2,
    user: {
      id: 2,
      email: "host@example.com",
      name: "Host User",
    },
    eventType: {
      id: 10,
      title: "Test Event",
      slug: "test-event",
      team: {
        id: 5,
        parentId: 1,
      },
    },
    attendees: [{ email: "guest@example.com" }],
    assignmentReason: [{ reasonString: "Matched by round-robin" }],
    routedFromRoutingFormReponse: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsByBookingUid.mockResolvedValue(false);
    mockCreateReport.mockResolvedValue({ id: "report-uuid-123" });
    vi.mocked(getWebhooks).mockResolvedValue([]);
    vi.mocked(sendGenericWebhookPayload).mockResolvedValue({ ok: true, status: 200 });
    mockDoesUserIdHaveAccessToBooking.mockResolvedValue(true);
    mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue(mockBooking);
  });

  describe("access control", () => {
    it("should throw FORBIDDEN when BookingAccessService denies access", async () => {
      mockDoesUserIdHaveAccessToBooking.mockResolvedValue(false);

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

    it("should throw NOT_FOUND when booking doesn't exist", async () => {
      mockDoesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue(null);

      await expect(
        reportWrongAssignmentHandler({
          ctx: { user: mockUser },
          input: mockInput,
        })
      ).rejects.toThrow(ErrorWithCode);

      await expect(
        reportWrongAssignmentHandler({
          ctx: { user: mockUser },
          input: mockInput,
        })
      ).rejects.toMatchObject({
        message: "Booking not found",
      });
    });

    it("should allow access when BookingAccessService grants access", async () => {
      mockDoesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue({
        ...mockBooking,
        userId: mockUser.id,
      });

      const result = await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: mockInput,
      });

      expect(result.success).toBe(true);
      expect(mockDoesUserIdHaveAccessToBooking).toHaveBeenCalledWith({
        userId: mockUser.id,
        bookingUid: mockInput.bookingUid,
      });
    });

    it("should throw BAD_REQUEST when a report already exists for the booking", async () => {
      mockDoesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue(mockBooking);
      mockExistsByBookingUid.mockResolvedValue(true);

      await expect(
        reportWrongAssignmentHandler({
          ctx: { user: mockUser },
          input: {
            bookingUid: "test-booking-uid",
            additionalNotes: "Duplicate report",
          },
        })
      ).rejects.toThrow(ErrorWithCode);

      await expect(
        reportWrongAssignmentHandler({
          ctx: { user: mockUser },
          input: {
            bookingUid: "test-booking-uid",
            additionalNotes: "Duplicate report",
          },
        })
      ).rejects.toMatchObject({
        message: "A wrong assignment report has already been submitted for this booking",
      });

      expect(mockCreateReport).not.toHaveBeenCalled();
    });
  });

  describe("successful report", () => {
    it("should successfully report with all fields", async () => {
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue({
        ...mockBooking,
        userId: mockUser.id,
      });

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
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue({
        ...mockBooking,
        userId: mockUser.id,
      });

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
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue({
        ...mockBooking,
        userId: mockUser.id,
      });
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
        userId: mockUser.id,
        teamId: mockBooking.eventType.team.id,
        orgId: mockBooking.eventType.team.parentId,
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
              firstAssignmentReason: mockBooking.assignmentReason[0].reasonString,
              guest: mockBooking.attendees[0].email,
              host: expect.objectContaining({
                email: mockBooking.user.email,
              }),
              correctAssignee: "correct@example.com",
              additionalNotes: "Wrong assignment notes",
            }),
          }),
        })
      );
    });

    it("should handle webhook failures gracefully", async () => {
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue({
        ...mockBooking,
        userId: mockUser.id,
      });
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
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue({
        ...mockBooking,
        userId: mockUser.id,
      });
      vi.mocked(getWebhooks).mockRejectedValue(new Error("Database error"));

      const result = await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: mockInput,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("database persistence", () => {
    it("should persist report to database with all fields", async () => {
      mockDoesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue(mockBooking);

      await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          correctAssignee: "correct@example.com",
          additionalNotes: "This booking should have gone to the sales team",
        },
      });

      expect(mockCreateReport).toHaveBeenCalledWith({
        bookingUid: "test-booking-uid",
        reportedById: mockUser.id,
        correctAssignee: "correct@example.com",
        additionalNotes: "This booking should have gone to the sales team",
        teamId: mockBooking.eventType.team.id,
        routingFormId: null,
      });
    });

    it("should persist report with null optional fields", async () => {
      mockDoesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue({
        ...mockBooking,
        eventType: null,
      });

      await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          additionalNotes: "Wrong person",
        },
      });

      expect(mockCreateReport).toHaveBeenCalledWith({
        bookingUid: "test-booking-uid",
        reportedById: mockUser.id,
        correctAssignee: null,
        additionalNotes: "Wrong person",
        teamId: null,
        routingFormId: null,
      });
    });

    it("should return reportId in response", async () => {
      mockDoesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue(mockBooking);

      const result = await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          additionalNotes: "Notes",
        },
      });

      expect(result.reportId).toBe("report-uuid-123");
    });

    it("should throw if database write fails", async () => {
      mockDoesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue(mockBooking);
      mockCreateReport.mockRejectedValue(new Error("Database error"));

      await expect(
        reportWrongAssignmentHandler({
          ctx: { user: mockUser },
          input: {
            bookingUid: "test-booking-uid",
            additionalNotes: "Notes",
          },
        })
      ).rejects.toThrow("Database error");
    });

    it("should persist report even when webhooks fail", async () => {
      mockDoesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue(mockBooking);
      vi.mocked(getWebhooks).mockRejectedValue(new Error("Webhook service down"));

      const result = await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          additionalNotes: "Notes",
        },
      });

      expect(mockCreateReport).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle booking without assignmentReason", async () => {
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue({
        ...mockBooking,
        userId: mockUser.id,
        assignmentReason: [],
      });
      vi.mocked(getWebhooks).mockResolvedValue([
        { id: "webhook-1", subscriberUrl: "https://example.com/webhook", secret: "secret123" },
      ] as never);

      await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: mockInput,
      });

      expect(sendGenericWebhookPayload).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            report: expect.objectContaining({
              firstAssignmentReason: null,
            }),
          }),
        })
      );
    });

    it("should handle booking without user", async () => {
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue({
        ...mockBooking,
        userId: null,
        user: null,
        attendees: [{ email: mockUser.email }],
      });

      const result = await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: mockInput,
      });

      expect(result.success).toBe(true);
      expect(getWebhooks).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
        })
      );
    });

    it("should handle booking without eventType", async () => {
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue({
        ...mockBooking,
        userId: mockUser.id,
        eventType: null,
      });
      vi.mocked(getWebhooks).mockResolvedValue([
        { id: "webhook-1", subscriberUrl: "https://example.com/webhook", secret: "secret123" },
      ] as never);

      await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: mockInput,
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
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue({
        ...mockBooking,
        userId: mockUser.id,
        attendees: [],
      });
      vi.mocked(getWebhooks).mockResolvedValue([
        { id: "webhook-1", subscriberUrl: "https://example.com/webhook", secret: "secret123" },
      ] as never);

      await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: mockInput,
      });

      expect(sendGenericWebhookPayload).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            report: expect.objectContaining({
              guest: null,
            }),
          }),
        })
      );
    });
  });
});

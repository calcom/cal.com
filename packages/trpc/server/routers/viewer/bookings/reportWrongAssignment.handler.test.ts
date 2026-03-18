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

const mockQueueWrongAssignmentReportWebhook = vi.fn();
vi.mock("@calcom/features/di/webhooks/containers/webhook", () => ({
  getWebhookProducer: () => ({
    queueWrongAssignmentReportWebhook: mockQueueWrongAssignmentReportWebhook,
  }),
}));
vi.mock("@calcom/prisma", () => ({
  default: {},
}));
vi.mock("@calcom/i18n/server", () => ({
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
    mockQueueWrongAssignmentReportWebhook.mockResolvedValue(undefined);
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
    it("should queue webhook with correct payload structure", async () => {
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue({
        ...mockBooking,
        userId: mockUser.id,
      });

      await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: {
          ...mockInput,
          correctAssignee: "correct@example.com",
          additionalNotes: "Wrong assignment notes",
        },
      });

      expect(mockQueueWrongAssignmentReportWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingUid: mockBooking.uid,
          userId: mockUser.id,
          wrongAssignmentReportId: "report-uuid-123",
          teamId: mockBooking.eventType.team.id,
          orgId: mockBooking.eventType.team.parentId,
        })
      );
    });

    it("should handle webhook queueing failures gracefully", async () => {
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue({
        ...mockBooking,
        userId: mockUser.id,
      });
      mockQueueWrongAssignmentReportWebhook.mockRejectedValue(new Error("Queue failed"));

      const result = await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: mockInput,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Wrong assignment reported successfully");
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
      mockQueueWrongAssignmentReportWebhook.mockRejectedValue(new Error("Webhook service down"));

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

      await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: mockInput,
      });

      expect(mockQueueWrongAssignmentReportWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          wrongAssignmentReportId: "report-uuid-123",
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
      expect(mockQueueWrongAssignmentReportWebhook).toHaveBeenCalledWith(
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

      await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: mockInput,
      });

      expect(mockQueueWrongAssignmentReportWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: null,
          orgId: null,
        })
      );
    });

    it("should handle booking without attendees", async () => {
      mockFindByUidIncludeUserAndEventTypeTeamAndAttendeesAndAssignmentReason.mockResolvedValue({
        ...mockBooking,
        userId: mockUser.id,
        attendees: [],
      });

      await reportWrongAssignmentHandler({
        ctx: { user: mockUser },
        input: mockInput,
      });

      expect(mockQueueWrongAssignmentReportWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          wrongAssignmentReportId: "report-uuid-123",
        })
      );
    });
  });
});

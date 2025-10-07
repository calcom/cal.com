import { describe, it, expect, vi, beforeEach } from "vitest";

import { BookingReportRepository } from "@calcom/features/bookings/lib/booking-report.repository";
import { extractBookerEmail } from "@calcom/features/bookings/lib/booking-report.utils";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import { BookingStatus, ReportReason } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import { reportBookingHandler } from "./reportBooking.handler";

vi.mock("@calcom/features/bookings/lib/booking-report.repository");
vi.mock("@calcom/features/bookings/lib/booking-report.utils");
vi.mock("@calcom/features/bookings/lib/handleCancelBooking");
vi.mock("@calcom/lib/server/repository/booking");
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe("reportBookingHandler", () => {
  const mockUser = {
    id: 1,
    email: "user@example.com",
    name: "Test User",
  };

  const mockBooking = {
    id: 100,
    uid: "test-booking-uid",
    startTime: new Date("2025-12-01T10:00:00Z"),
    status: BookingStatus.ACCEPTED,
    recurringEventId: null,
    attendees: [{ email: "booker@example.com" }],
    seatsReferences: [],
    reports: [],
  };

  let mockBookingRepo: any;
  let mockReportRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBookingRepo = {
      doesUserIdHaveAccessToBooking: vi.fn(),
      getBookingForReporting: vi.fn(),
    };
    mockReportRepo = {
      createReport: vi.fn(),
      hasUserReportedSeries: vi.fn(),
    };

    vi.mocked(BookingRepository).mockImplementation(() => mockBookingRepo);
    vi.mocked(BookingReportRepository).mockImplementation(() => mockReportRepo);
    vi.mocked(extractBookerEmail).mockReturnValue("booker@example.com");
  });

  describe("access control", () => {
    it("should throw FORBIDDEN when user doesn't have access to booking", async () => {
      mockBookingRepo.doesUserIdHaveAccessToBooking.mockResolvedValue(false);

      await expect(
        reportBookingHandler({
          ctx: { user: mockUser },
          input: {
            bookingId: 100,
            reason: ReportReason.SPAM,
            cancelBooking: false,
            allRemainingBookings: false,
          },
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        reportBookingHandler({
          ctx: { user: mockUser },
          input: {
            bookingId: 100,
            reason: ReportReason.SPAM,
            cancelBooking: false,
            allRemainingBookings: false,
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You don't have access to this booking",
      });
    });

    it("should throw NOT_FOUND when booking doesn't exist", async () => {
      mockBookingRepo.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.getBookingForReporting.mockResolvedValue(null);

      await expect(
        reportBookingHandler({
          ctx: { user: mockUser },
          input: {
            bookingId: 100,
            reason: ReportReason.SPAM,
            cancelBooking: false,
            allRemainingBookings: false,
          },
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Booking not found",
      });
    });
  });

  describe("cancelled/rejected booking validation", () => {
    it("should throw BAD_REQUEST when trying to report cancelled booking", async () => {
      mockBookingRepo.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.getBookingForReporting.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
      });

      await expect(
        reportBookingHandler({
          ctx: { user: mockUser },
          input: {
            bookingId: 100,
            reason: ReportReason.SPAM,
            cancelBooking: false,
            allRemainingBookings: false,
          },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Cannot report cancelled or rejected bookings",
      });
    });

    it("should throw BAD_REQUEST when trying to report rejected booking", async () => {
      mockBookingRepo.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.getBookingForReporting.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.REJECTED,
      });

      await expect(
        reportBookingHandler({
          ctx: { user: mockUser },
          input: {
            bookingId: 100,
            reason: ReportReason.SPAM,
            cancelBooking: false,
            allRemainingBookings: false,
          },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Cannot report cancelled or rejected bookings",
      });
    });
  });

  describe("duplicate report prevention", () => {
    it("should throw BAD_REQUEST when user already reported this booking", async () => {
      mockBookingRepo.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.getBookingForReporting.mockResolvedValue({
        ...mockBooking,
        reports: [{ id: "existing-report", reportedById: mockUser.id }],
      });

      await expect(
        reportBookingHandler({
          ctx: { user: mockUser },
          input: {
            bookingId: 100,
            reason: ReportReason.SPAM,
            cancelBooking: false,
            allRemainingBookings: false,
          },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "You have already reported this booking",
      });
    });
  });

  describe("recurring bookings", () => {
    it("should throw BAD_REQUEST when user already reported recurring series", async () => {
      mockBookingRepo.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.getBookingForReporting.mockResolvedValue({
        ...mockBooking,
        recurringEventId: "recurring-123",
      });
      mockReportRepo.hasUserReportedSeries.mockResolvedValue(true);

      await expect(
        reportBookingHandler({
          ctx: { user: mockUser },
          input: {
            bookingId: 100,
            reason: ReportReason.SPAM,
            cancelBooking: false,
            allRemainingBookings: true,
          },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "You have already reported this recurring booking series",
      });
    });
  });

  describe("successful report creation", () => {
    it("should successfully create a single booking report", async () => {
      mockBookingRepo.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.getBookingForReporting.mockResolvedValue(mockBooking);
      mockReportRepo.createReport.mockResolvedValue({ id: "new-report" });

      const result = await reportBookingHandler({
        ctx: { user: mockUser },
        input: {
          bookingId: 100,
          reason: ReportReason.SPAM,
          description: "This is spam",
          cancelBooking: false,
          allRemainingBookings: false,
        },
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Booking reported successfully");
      expect(result.reportedCount).toBe(1);
      expect(mockReportRepo.createReport).toHaveBeenCalledWith({
        bookingId: 100,
        bookerEmail: "booker@example.com",
        reportedById: mockUser.id,
        reason: ReportReason.SPAM,
        description: "This is spam",
        cancelled: false,
      });
    });

    it("should create report without description", async () => {
      mockBookingRepo.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.getBookingForReporting.mockResolvedValue(mockBooking);
      mockReportRepo.createReport.mockResolvedValue({ id: "new-report" });

      await reportBookingHandler({
        ctx: { user: mockUser },
        input: {
          bookingId: 100,
          reason: ReportReason.DONT_KNOW_PERSON,
          cancelBooking: false,
          allRemainingBookings: false,
        },
      });

      expect(mockReportRepo.createReport).toHaveBeenCalledWith({
        bookingId: 100,
        bookerEmail: "booker@example.com",
        reportedById: mockUser.id,
        reason: ReportReason.DONT_KNOW_PERSON,
        description: undefined,
        cancelled: false,
      });
    });
  });

  describe("cancellation integration", () => {
    it("should cancel booking when cancelBooking is true", async () => {
      mockBookingRepo.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.getBookingForReporting.mockResolvedValue({
        ...mockBooking,
        startTime: new Date(Date.now() + 86400000), // Tomorrow
      });
      mockReportRepo.createReport.mockResolvedValue({ id: "new-report" });
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingId: 100,
        bookingUid: "test-booking-uid",
      });

      const result = await reportBookingHandler({
        ctx: { user: mockUser },
        input: {
          bookingId: 100,
          reason: ReportReason.SPAM,
          description: "Spam booking",
          cancelBooking: true,
          allRemainingBookings: false,
        },
      });

      expect(result.message).toBe("Booking reported and cancelled successfully");
      expect(handleCancelBooking).toHaveBeenCalledWith({
        bookingData: {
          uid: "test-booking-uid",
          cancelledBy: mockUser.email,
          cancellationReason: "Spam booking",
          allRemainingBookings: undefined,
        },
        userId: mockUser.id,
      });
    });

    it("should not cancel booking if it's in the past", async () => {
      mockBookingRepo.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.getBookingForReporting.mockResolvedValue({
        ...mockBooking,
        startTime: new Date(Date.now() - 86400000),
      });
      mockReportRepo.createReport.mockResolvedValue({ id: "new-report" });

      const result = await reportBookingHandler({
        ctx: { user: mockUser },
        input: {
          bookingId: 100,
          reason: ReportReason.SPAM,
          cancelBooking: true,
          allRemainingBookings: false,
        },
      });

      expect(handleCancelBooking).not.toHaveBeenCalled();
      expect(result.message).toBe("Booking reported successfully");
    });

    it("should handle cancellation failure gracefully", async () => {
      mockBookingRepo.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.getBookingForReporting.mockResolvedValue({
        ...mockBooking,
        startTime: new Date(Date.now() + 86400000),
      });
      mockReportRepo.createReport.mockResolvedValue({ id: "new-report" });
      vi.mocked(handleCancelBooking).mockRejectedValue(new Error("Cancellation failed"));

      const result = await reportBookingHandler({
        ctx: { user: mockUser },
        input: {
          bookingId: 100,
          reason: ReportReason.SPAM,
          cancelBooking: true,
          allRemainingBookings: false,
        },
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Booking reported successfully, but cancellation failed");
      expect(result.cancellationError).toBeDefined();
    });

    it("should use cancelSubsequentBookings for recurring events", async () => {
      mockBookingRepo.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.getBookingForReporting.mockResolvedValue({
        ...mockBooking,
        recurringEventId: "recurring-123",
        startTime: new Date(Date.now() + 86400000),
      });
      mockReportRepo.createReport.mockResolvedValue({ id: "new-report" });
      mockReportRepo.hasUserReportedSeries.mockResolvedValue(false);
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingId: 100,
        bookingUid: "test-booking-uid",
      });

      await reportBookingHandler({
        ctx: { user: mockUser },
        input: {
          bookingId: 100,
          reason: ReportReason.SPAM,
          cancelBooking: true,
          allRemainingBookings: true,
        },
      });

      expect(handleCancelBooking).toHaveBeenCalledWith({
        bookingData: expect.objectContaining({
          cancelSubsequentBookings: true,
        }),
        userId: mockUser.id,
      });
    });

    it("should pass seatReferenceUid for seated events", async () => {
      mockBookingRepo.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.getBookingForReporting.mockResolvedValue({
        ...mockBooking,
        startTime: new Date(Date.now() + 86400000),
        seatsReferences: [
          { referenceUid: "seat-123", attendee: { email: mockUser.email } },
          { referenceUid: "seat-456", attendee: { email: "other@example.com" } },
        ],
      });
      mockReportRepo.createReport.mockResolvedValue({ id: "new-report" });
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingId: 100,
        bookingUid: "test-booking-uid",
      });

      await reportBookingHandler({
        ctx: { user: mockUser },
        input: {
          bookingId: 100,
          reason: ReportReason.SPAM,
          cancelBooking: true,
          allRemainingBookings: false,
        },
      });

      expect(handleCancelBooking).toHaveBeenCalledWith({
        bookingData: expect.objectContaining({
          seatReferenceUid: "seat-123",
        }),
        userId: mockUser.id,
      });
    });
  });
});
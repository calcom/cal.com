import { describe, it, expect, vi, beforeEach } from "vitest";

import { PrismaBookingReportRepository } from "@calcom/features/bookingReport/repositories/PrismaBookingReportRepository";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import { BookingStatus, BookingReportReason } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import { reportBookingHandler } from "./reportBooking.handler";

vi.mock("@calcom/features/bookingReport/repositories/PrismaBookingReportRepository");
vi.mock("@calcom/features/bookings/lib/handleCancelBooking");
vi.mock("@calcom/features/bookings/repositories/BookingRepository");
vi.mock("@calcom/features/bookings/services/BookingAccessService");
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
    report: null,
  };

  const mockBookingRepo = {
    findByUidIncludeReport: vi.fn(),
    getActiveRecurringBookingsFromDate: vi.fn(),
  };

  const mockReportRepo = {
    createReport: vi.fn(),
    findAllReportedBookings: vi.fn(),
  };

  const mockBookingAccessService = {
    doesUserIdHaveAccessToBooking: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(BookingRepository).mockImplementation(() => mockBookingRepo);
    vi.mocked(PrismaBookingReportRepository).mockImplementation(() => mockReportRepo);
    vi.mocked(BookingAccessService).mockImplementation(() => mockBookingAccessService);
    mockReportRepo.createReport.mockResolvedValue({ id: "new-report" });
  });

  describe("access control", () => {
    it("should throw FORBIDDEN when user doesn't have access to booking", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(false);

      await expect(
        reportBookingHandler({
          ctx: { user: mockUser },
          input: {
            bookingUid: "test-booking-uid",
            reason: BookingReportReason.SPAM,
          },
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        reportBookingHandler({
          ctx: { user: mockUser },
          input: {
            bookingUid: "test-booking-uid",
            reason: BookingReportReason.SPAM,
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You don't have access to this booking",
      });
    });

    it("should throw NOT_FOUND when booking doesn't exist", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue(null);

      await expect(
        reportBookingHandler({
          ctx: { user: mockUser },
          input: {
            bookingUid: "test-booking-uid",
            reason: BookingReportReason.SPAM,
          },
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Booking not found",
      });
    });
  });

  describe("duplicate report prevention", () => {
    it("should throw BAD_REQUEST when booking already has a report", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue({
        ...mockBooking,
        report: { id: "existing-report" },
      });

      await expect(
        reportBookingHandler({
          ctx: { user: mockUser },
          input: {
            bookingUid: "test-booking-uid",
            reason: BookingReportReason.SPAM,
          },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "This booking has already been reported",
      });
    });
  });

  describe("successful report creation", () => {
    it("should successfully create a single booking report and auto-cancel upcoming booking", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue({
        ...mockBooking,
        startTime: new Date(Date.now() + 86400000), // Tomorrow
      });
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      const result = await reportBookingHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          reason: BookingReportReason.SPAM,
          description: "This is spam",
        },
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Booking reported and cancelled successfully");
      expect(result.reportedCount).toBe(1);
      expect(mockReportRepo.createReport).toHaveBeenCalledWith({
        bookingUid: "test-booking-uid",
        bookerEmail: "booker@example.com",
        reportedById: mockUser.id,
        reason: BookingReportReason.SPAM,
        description: "This is spam",
        cancelled: true,
        organizationId: undefined,
      });
    });

    it("should create report without description for past booking", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue({
        ...mockBooking,
        startTime: new Date(Date.now() - 86400000), // Yesterday
      });

      const result = await reportBookingHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          reason: BookingReportReason.DONT_KNOW_PERSON,
        },
      });

      expect(result.message).toBe("Booking reported successfully");
      expect(mockReportRepo.createReport).toHaveBeenCalledWith({
        bookingUid: "test-booking-uid",
        bookerEmail: "booker@example.com",
        reportedById: mockUser.id,
        reason: BookingReportReason.DONT_KNOW_PERSON,
        description: undefined,
        cancelled: false,
        organizationId: undefined,
      });
    });
  });

  describe("cancellation integration", () => {
    it("should cancel booking when cancelBooking is true", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue({
        ...mockBooking,
        startTime: new Date(Date.now() + 86400000), // Tomorrow
      });
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      const result = await reportBookingHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          reason: BookingReportReason.SPAM,
          description: "Spam booking",
        },
      });

      expect(result.message).toBe("Booking reported and cancelled successfully");
      expect(handleCancelBooking).toHaveBeenCalledWith({
        bookingData: {
          uid: "test-booking-uid",
          cancelledBy: mockUser.email,
          skipCancellationReasonValidation: true,
        },
        userId: mockUser.id,
      });
    });

    it("should not cancel booking if it's in the past", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue({
        ...mockBooking,
        startTime: new Date(Date.now() - 86400000),
      });

      const result = await reportBookingHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          reason: BookingReportReason.SPAM,
        },
      });

      expect(handleCancelBooking).not.toHaveBeenCalled();
      expect(result.message).toBe("Booking reported successfully");
    });

    it("should handle cancellation failure gracefully", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue({
        ...mockBooking,
        startTime: new Date(Date.now() + 86400000),
      });
      vi.mocked(handleCancelBooking).mockRejectedValue(new Error("Cancellation failed"));

      const result = await reportBookingHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          reason: BookingReportReason.SPAM,
        },
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Booking reported successfully, but cancellation failed");
      expect(result).not.toHaveProperty("cancellationError");
    });

    it("should use cancelSubsequentBookings for recurring events", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue({
        ...mockBooking,
        recurringEventId: "recurring-123",
        startTime: new Date(Date.now() + 86400000),
      });
      mockBookingRepo.getActiveRecurringBookingsFromDate.mockResolvedValue([
        { uid: "100" },
        { uid: "101" },
        { uid: "102" },
      ]);
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      await reportBookingHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          reason: BookingReportReason.SPAM,
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
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue({
        ...mockBooking,
        startTime: new Date(Date.now() + 86400000),
        seatsReferences: [
          { referenceUid: "seat-123", attendee: { email: mockUser.email } },
          { referenceUid: "seat-456", attendee: { email: "other@example.com" } },
        ],
      });
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      await reportBookingHandler({
        ctx: { user: mockUser },
        input: {
          bookingUid: "test-booking-uid",
          reason: BookingReportReason.SPAM,
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

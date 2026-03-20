import { describe, it, expect, vi, beforeEach } from "vitest";

import { BookingReportService } from "@calcom/features/bookingReport/services/BookingReportService";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { BookingReportReason } from "@calcom/prisma/enums";
import { ErrorCode } from "@calcom/lib/errorCodes";

import { checkIfFreeEmailDomain } from "@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain";

import { reportBookingHandler } from "./reportBooking.handler";

vi.mock("@calcom/features/bookings/lib/handleCancelBooking");
vi.mock("@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain", () => ({
  checkIfFreeEmailDomain: vi.fn().mockResolvedValue(false),
}));
vi.mock("@calcom/features/watchlist/lib/utils/normalization", () => ({
  extractDomainFromEmail: (email: string) => email.split("@")[1],
}));
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

const mockBookingRepo = {
  findByUidIncludeReportAndEventType: vi.fn(),
  findUpcomingByAttendeeEmail: vi.fn(),
  findUpcomingByAttendeeDomain: vi.fn(),
};

const mockReportRepo = {
  createReport: vi.fn(),
};

const mockBookingAccessService = {
  doesUserIdHaveAccessToBooking: vi.fn(),
};

vi.mock("@calcom/features/bookingReport/di/BookingReportService.container", () => ({
  getBookingReportService: vi.fn().mockImplementation(
    () =>
      new BookingReportService({
        bookingRepo: mockBookingRepo as never,
        bookingReportRepo: mockReportRepo as never,
        bookingAccessService: mockBookingAccessService as never,
      })
  ),
}));

describe("reportBookingHandler", () => {
  const mockUser = {
    id: 1,
    email: "user@example.com",
    name: "Test User",
    organizationId: undefined,
  };

  const mockActionSource = "WEBAPP" as const;

  const tomorrow = new Date(Date.now() + 86400000);
  const yesterday = new Date(Date.now() - 86400000);

  const mockBooking = {
    id: 100,
    uid: "test-booking-uid",
    userId: 1,
    startTime: tomorrow,
    status: "ACCEPTED",
    attendees: [{ email: "booker@spammer.com" }],
    seatsReferences: [],
    report: null,
    eventType: null,
    user: { profiles: [] },
  };

  function callHandler(inputOverrides = {}) {
    return reportBookingHandler({
      ctx: { user: mockUser },
      input: {
        bookingUid: "test-booking-uid",
        reason: BookingReportReason.SPAM,
        ...inputOverrides,
      },
      actionSource: mockActionSource,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mockReportRepo.createReport.mockResolvedValue({ id: "new-report" });
    mockBookingRepo.findByUidIncludeReportAndEventType.mockReset();
    mockBookingRepo.findUpcomingByAttendeeEmail.mockResolvedValue([]);
    mockBookingRepo.findUpcomingByAttendeeDomain.mockResolvedValue([]);
  });

  describe("access control", () => {
    it("should throw FORBIDDEN when user doesn't have access to booking", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(false);

      await expect(callHandler()).rejects.toMatchObject({
        code: ErrorCode.Forbidden,
      });
    });

    it("should throw NOT_FOUND when booking doesn't exist", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(null);

      await expect(callHandler()).rejects.toMatchObject({
        code: ErrorCode.NotFound,
      });
    });

    it("should throw BAD_REQUEST when booking already has a report", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
        ...mockBooking,
        report: { id: "existing-report" },
      });

      await expect(callHandler()).rejects.toMatchObject({
        code: ErrorCode.BadRequest,
        message: "This booking has already been reported",
      });
    });

    it("should throw BAD_REQUEST when booking has no attendees", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
        ...mockBooking,
        attendees: [],
      });

      await expect(callHandler()).rejects.toMatchObject({
        code: ErrorCode.BadRequest,
        message: "Booking has no attendees",
      });
    });

    it("should allow EMAIL reporting for seated event bookings", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
        ...mockBooking,
        seatsReferences: [{ referenceUid: "seat-1", attendee: { email: "booker@spammer.com" } }],
      });
      mockBookingRepo.findUpcomingByAttendeeEmail.mockResolvedValue([]);
      vi.mocked(handleCancelBooking).mockResolvedValue({ success: true, bookingId: 100 });
      mockReportRepo.createReport.mockResolvedValue({});

      const result = await callHandler({ reportType: "EMAIL" });

      expect(result.success).toBe(true);
    });

    it("should throw BAD_REQUEST for DOMAIN reporting on seated event bookings", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
        ...mockBooking,
        seatsReferences: [{ referenceUid: "seat-1", attendee: { email: "booker@spammer.com" } }],
      });

      await expect(callHandler({ reportType: "DOMAIN" })).rejects.toMatchObject({
        code: ErrorCode.BadRequest,
        message: "Domain reporting is not available for seated events",
      });

      expect(handleCancelBooking).not.toHaveBeenCalled();
    });
  });

  describe("EMAIL report type", () => {
    beforeEach(() => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
    });

    it("should query by attendee email and cancel upcoming booking", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
      mockBookingRepo.findUpcomingByAttendeeEmail.mockResolvedValue([]);
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      const result = await callHandler({ reportType: "EMAIL" });

      expect(mockBookingRepo.findUpcomingByAttendeeEmail).toHaveBeenCalledWith({
        attendeeEmail: "booker@spammer.com",
        hostUserId: mockUser.id,
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("Booking reported and cancelled successfully");
    });

    it("should use booker email (not domain) for report creation", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      await callHandler({ reportType: "EMAIL" });

      expect(mockReportRepo.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          bookerEmail: "booker@spammer.com",
        })
      );
    });

    it("should cancel additional bookings from the same email", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
      mockBookingRepo.findUpcomingByAttendeeEmail.mockResolvedValue([
        { uid: "additional-1", report: null, attendees: [{ email: "booker@spammer.com" }] },
        { uid: "additional-2", report: null, attendees: [{ email: "booker@spammer.com" }] },
      ]);
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      const result = await callHandler({ reportType: "EMAIL" });

      // Original + 2 additional
      expect(handleCancelBooking).toHaveBeenCalledTimes(3);
      expect(result.reportedCount).toBe(3);
    });
  });

  describe("DOMAIN report type", () => {
    beforeEach(() => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
    });

    it("should query by attendee domain", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      await callHandler({ reportType: "DOMAIN" });

      expect(mockBookingRepo.findUpcomingByAttendeeDomain).toHaveBeenCalledWith({
        domain: "spammer.com",
        hostUserId: mockUser.id,
      });
      expect(mockBookingRepo.findUpcomingByAttendeeEmail).not.toHaveBeenCalled();
    });

    it("should use @domain as bookerEmail for report grouping", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      await callHandler({ reportType: "DOMAIN" });

      expect(mockReportRepo.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          bookerEmail: "@spammer.com",
        })
      );
    });

    it("should cancel bookings from different emails on the same domain", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
      mockBookingRepo.findUpcomingByAttendeeDomain.mockResolvedValue([
        { uid: "domain-match-1", report: null, attendees: [{ email: "other@spammer.com" }] },
      ]);
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      const result = await callHandler({ reportType: "DOMAIN" });

      // Original + 1 domain match
      expect(handleCancelBooking).toHaveBeenCalledTimes(2);
      expect(result.reportedCount).toBe(2);
    });

    it("should reject DOMAIN report for free email domains", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
        ...mockBooking,
        attendees: [{ email: "booker@gmail.com" }],
      });
      vi.mocked(checkIfFreeEmailDomain).mockResolvedValue(true);

      await expect(callHandler({ reportType: "DOMAIN" })).rejects.toMatchObject({
        code: ErrorCode.BadRequest,
        message: "Cannot report by domain for free email providers",
      });

      expect(handleCancelBooking).not.toHaveBeenCalled();

      // Reset for other tests
      vi.mocked(checkIfFreeEmailDomain).mockResolvedValue(false);
    });
  });

  describe("skipNotifications", () => {
    it("should pass skipNotifications: true to handleCancelBooking", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      await callHandler();

      expect(handleCancelBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingData: expect.objectContaining({
            skipCancellationReasonValidation: true,
            cancelledBy: mockUser.email,
          }),
          skipNotifications: true,
          actionSource: mockActionSource,
        })
      );
    });
  });

  describe("cancellation behavior", () => {
    beforeEach(() => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
    });

    it("should not cancel past bookings", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
        ...mockBooking,
        startTime: yesterday,
      });
      mockBookingRepo.findUpcomingByAttendeeEmail.mockResolvedValue([]);

      const result = await callHandler();

      expect(handleCancelBooking).not.toHaveBeenCalled();
      expect(result.message).toBe("Booking reported successfully");
    });

    it("should skip already-reported bookings in additional matches", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
      mockBookingRepo.findUpcomingByAttendeeEmail.mockResolvedValue([
        { uid: "already-reported", report: { id: "r1" }, attendees: [{ email: "booker@spammer.com" }] },
        { uid: "not-reported", report: null, attendees: [{ email: "booker@spammer.com" }] },
      ]);
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      const result = await callHandler();

      // Original + 1 unreported additional (skip the already-reported one)
      expect(handleCancelBooking).toHaveBeenCalledTimes(2);
      expect(result.reportedCount).toBe(2);
    });

    it("should mark cancelled flag only for bookings that were actually cancelled", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
      mockBookingRepo.findUpcomingByAttendeeEmail.mockResolvedValue([
        { uid: "additional-1", report: null, attendees: [{ email: "booker@spammer.com" }] },
      ]);
      // First cancellation (original) succeeds, second (additional) fails
      vi.mocked(handleCancelBooking)
        .mockResolvedValueOnce({
          success: true,
          message: "Cancelled",
          onlyRemovedAttendee: false,
          bookingUid: "test-booking-uid",
        })
        .mockRejectedValueOnce(new Error("Cancellation failed"));

      const result = await callHandler();

      expect(result.success).toBe(true);
      expect(result.reportedCount).toBe(2);

      // Original booking was cancelled successfully
      expect(mockReportRepo.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingUid: "test-booking-uid",
          cancelled: true,
        })
      );
      // Additional booking cancellation failed — should be marked as not cancelled
      expect(mockReportRepo.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingUid: "additional-1",
          cancelled: false,
        })
      );
    });

    it("should report but not cancel when all cancellations fail", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
      vi.mocked(handleCancelBooking).mockRejectedValue(new Error("Cancellation failed"));

      const result = await callHandler();

      expect(result.success).toBe(true);
      expect(result.message).toBe("Booking reported successfully");
    });
  });

  describe("host user scoping", () => {
    it("should use booking.userId as hostUserId when available", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
        ...mockBooking,
        userId: 99, // Different from user.id (1)
      });
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      await callHandler({ reportType: "EMAIL" });

      expect(mockBookingRepo.findUpcomingByAttendeeEmail).toHaveBeenCalledWith({
        attendeeEmail: "booker@spammer.com",
        hostUserId: 99,
      });
    });

    it("should fall back to user.id when booking.userId is null", async () => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
        ...mockBooking,
        userId: null,
      });
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      await callHandler({ reportType: "EMAIL" });

      expect(mockBookingRepo.findUpcomingByAttendeeEmail).toHaveBeenCalledWith({
        attendeeEmail: "booker@spammer.com",
        hostUserId: mockUser.id,
      });
    });
  });

  describe("report count messages", () => {
    beforeEach(() => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
    });

    it("should say 'N bookings reported' when multiple bookings are reported", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
      mockBookingRepo.findUpcomingByAttendeeEmail.mockResolvedValue([
        { uid: "extra-1", report: null, attendees: [{ email: "booker@spammer.com" }] },
        { uid: "extra-2", report: null, attendees: [{ email: "booker@spammer.com" }] },
      ]);
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      const result = await callHandler();

      expect(result.message).toBe("3 bookings reported and cancelled successfully");
      expect(result.reportedCount).toBe(3);
    });
  });
});

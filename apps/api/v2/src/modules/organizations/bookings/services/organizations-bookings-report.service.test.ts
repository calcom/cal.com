import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationsBookingsReportService } from "./organizations-bookings-report.service";

const tomorrow = new Date(Date.now() + 86400000);

const mockBooking = {
  id: 100,
  uid: "test-booking-uid",
  userId: 1,
  startTime: tomorrow,
  status: "ACCEPTED",
  attendees: [{ email: "booker@spammer.com" }],
  seatsReferences: [],
  report: null,
  eventType: { teamId: 5, team: { id: 5, parentId: null } },
  user: { profiles: [{ organizationId: 5 }] },
};

function createMockBookingReportService() {
  return {
    validateOrgBooking: vi.fn().mockResolvedValue({
      booking: mockBooking,
      bookerEmail: "booker@spammer.com",
    }),
    findUpcomingUnreportedOrgBookings: vi.fn().mockResolvedValue([]),
    cancelReportedBookings: vi.fn().mockResolvedValue({ cancelledUids: new Set<string>() }),
    createReport: vi.fn().mockResolvedValue(undefined),
  };
}

const defaultInput = {
  bookingUid: "test-booking-uid",
  reason: "SPAM" as const,
  reportType: "EMAIL" as const,
  userId: 1,
  userEmail: "admin@org.com",
  organizationId: 5,
  actionSource: "API_V2" as const,
};

describe("OrganizationsBookingsReportService", () => {
  let service: OrganizationsBookingsReportService;
  let mockReportService: ReturnType<typeof createMockBookingReportService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReportService = createMockBookingReportService();
    service = new OrganizationsBookingsReportService(mockReportService as never);
  });

  describe("report - validation", () => {
    it("should call validateOrgBooking with correct params", async () => {
      await service.report(defaultInput);

      expect(mockReportService.validateOrgBooking).toHaveBeenCalledWith({
        bookingUid: "test-booking-uid",
        organizationId: 5,
        reportType: "EMAIL",
      });
    });
  });

  describe("report - cancellation and creation", () => {
    it("should find upcoming unreported org bookings", async () => {
      await service.report(defaultInput);

      expect(mockReportService.findUpcomingUnreportedOrgBookings).toHaveBeenCalledWith({
        reportType: "EMAIL",
        bookerEmail: "booker@spammer.com",
        organizationId: 5,
      });
    });

    it("should cancel the reported booking when it is upcoming", async () => {
      mockReportService.cancelReportedBookings.mockResolvedValue({
        cancelledUids: new Set(["test-booking-uid"]),
      });

      await service.report(defaultInput);

      expect(mockReportService.cancelReportedBookings).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingUids: expect.arrayContaining(["test-booking-uid"]),
          userEmail: "admin@org.com",
          userId: 1,
          actionSource: "API_V2",
        })
      );
    });

    it("should cancel additional org bookings along with the reported one", async () => {
      mockReportService.findUpcomingUnreportedOrgBookings.mockResolvedValue([
        { uid: "org-booking-1", report: null, attendees: [{ email: "booker@spammer.com" }] },
        { uid: "org-booking-2", report: null, attendees: [{ email: "booker@spammer.com" }] },
      ]);
      mockReportService.cancelReportedBookings.mockResolvedValue({
        cancelledUids: new Set(["test-booking-uid", "org-booking-1", "org-booking-2"]),
      });

      const result = await service.report(defaultInput);

      expect(mockReportService.cancelReportedBookings).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingUids: expect.arrayContaining(["test-booking-uid", "org-booking-1", "org-booking-2"]),
        })
      );
      expect(result.success).toBe(true);
    });

    it("should not include the original booking uid in additional uids", async () => {
      mockReportService.findUpcomingUnreportedOrgBookings.mockResolvedValue([
        { uid: "test-booking-uid", report: null, attendees: [{ email: "booker@spammer.com" }] },
        { uid: "org-booking-1", report: null, attendees: [{ email: "booker@spammer.com" }] },
      ]);

      await service.report(defaultInput);

      const cancelCall = mockReportService.cancelReportedBookings.mock.calls[0][0];
      const uidCount = cancelCall.bookingUids.filter((u: string) => u === "test-booking-uid").length;
      expect(uidCount).toBe(1);
    });

    it("should not cancel past bookings", async () => {
      const yesterday = new Date(Date.now() - 86400000);
      mockReportService.validateOrgBooking.mockResolvedValue({
        booking: { ...mockBooking, startTime: yesterday, status: "ACCEPTED" },
        bookerEmail: "booker@spammer.com",
      });

      await service.report(defaultInput);

      const cancelCall = mockReportService.cancelReportedBookings.mock.calls[0][0];
      expect(cancelCall.bookingUids).not.toContain("test-booking-uid");
    });

    it("should create a report with correct params", async () => {
      mockReportService.cancelReportedBookings.mockResolvedValue({
        cancelledUids: new Set(["test-booking-uid"]),
      });

      await service.report(defaultInput);

      expect(mockReportService.createReport).toHaveBeenCalledWith({
        bookingUid: "test-booking-uid",
        bookerEmail: "booker@spammer.com",
        reportedById: 1,
        reason: "SPAM",
        description: undefined,
        cancelled: true,
        organizationId: 5,
      });
    });

    it("should pass description to createReport when provided", async () => {
      await service.report({ ...defaultInput, description: "Very spammy" });

      expect(mockReportService.createReport).toHaveBeenCalledWith(
        expect.objectContaining({ description: "Very spammy" })
      );
    });

    it("should use domain as bookerEmail for DOMAIN report type", async () => {
      await service.report({ ...defaultInput, reportType: "DOMAIN" });

      expect(mockReportService.createReport).toHaveBeenCalledWith(
        expect.objectContaining({ bookerEmail: "@spammer.com" })
      );
    });

    it("should set cancelled to false when booking was not cancelled", async () => {
      mockReportService.cancelReportedBookings.mockResolvedValue({
        cancelledUids: new Set(),
      });

      await service.report(defaultInput);

      expect(mockReportService.createReport).toHaveBeenCalledWith(
        expect.objectContaining({ cancelled: false })
      );
    });

    it("should return success with cancelled message when bookings were cancelled", async () => {
      mockReportService.cancelReportedBookings.mockResolvedValue({
        cancelledUids: new Set(["test-booking-uid"]),
      });

      const result = await service.report(defaultInput);

      expect(result).toEqual({
        success: true,
        message: "Booking reported and cancelled successfully",
        bookingUid: "test-booking-uid",
        reportedCount: 1,
        cancelledCount: 1,
      });
    });

    it("should return success without cancelled message when no bookings were cancelled", async () => {
      const result = await service.report(defaultInput);

      expect(result).toEqual({
        success: true,
        message: "Booking reported successfully",
        bookingUid: "test-booking-uid",
        reportedCount: 1,
        cancelledCount: 0,
      });
    });

    it("should throw when booking already has a report", async () => {
      mockReportService.validateOrgBooking.mockResolvedValue({
        booking: { ...mockBooking, report: { id: "existing-report" } },
        bookerEmail: "booker@spammer.com",
      });

      await expect(service.report(defaultInput)).rejects.toThrow("This booking has already been reported");
    });
  });
});

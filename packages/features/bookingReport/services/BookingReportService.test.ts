import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { checkIfFreeEmailDomain } from "@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingReportService } from "./BookingReportService";

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

describe("BookingReportService", () => {
  const mockBookingRepo = {
    findByUidIncludeReport: vi.fn(),
    findByUidIncludeReportAndEventType: vi.fn(),
    findUpcomingByAttendeeEmail: vi.fn(),
    findUpcomingByAttendeeDomain: vi.fn(),
    findUpcomingUnreportedOrgBookingsByEmail: vi.fn(),
    findUpcomingUnreportedOrgBookingsByDomain: vi.fn(),
  };

  const mockReportRepo = {
    createReport: vi.fn(),
  };

  const mockBookingAccessService = {
    doesUserIdHaveAccessToBooking: vi.fn(),
  };

  const mockOrganizationSettingsRepo = {
    getBlocklistSettings: vi.fn(),
  };

  let service: BookingReportService;

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

  const defaultInput = {
    bookingUid: "test-booking-uid",
    reason: "SPAM" as const,
    reportType: "EMAIL" as const,
    userId: 1,
    userEmail: "user@example.com",
    organizationId: null,
    actionSource: "WEBAPP" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new BookingReportService({
      bookingRepo: mockBookingRepo as never,
      bookingReportRepo: mockReportRepo as never,
      bookingAccessService: mockBookingAccessService as never,
      organizationSettingsRepo: mockOrganizationSettingsRepo as never,
    });

    mockReportRepo.createReport.mockResolvedValue({ id: "new-report" });
    mockBookingRepo.findUpcomingByAttendeeEmail.mockResolvedValue([]);
    mockBookingRepo.findUpcomingByAttendeeDomain.mockResolvedValue([]);
    mockBookingRepo.findUpcomingUnreportedOrgBookingsByEmail.mockResolvedValue([]);
    mockBookingRepo.findUpcomingUnreportedOrgBookingsByDomain.mockResolvedValue([]);
    mockOrganizationSettingsRepo.getBlocklistSettings.mockResolvedValue(null);
  });

  describe("reportBooking", () => {
    describe("access control", () => {
      it("should throw Forbidden when user has no access", async () => {
        mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(false);

        await expect(service.reportBooking(defaultInput)).rejects.toMatchObject({
          code: ErrorCode.Forbidden,
        });

        expect(mockBookingAccessService.doesUserIdHaveAccessToBooking).toHaveBeenCalledWith({
          userId: 1,
          bookingUid: "test-booking-uid",
        });
      });

      it("should throw NotFound when booking does not exist", async () => {
        mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
        mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(null);

        await expect(service.reportBooking(defaultInput)).rejects.toMatchObject({
          code: ErrorCode.NotFound,
        });
      });

      it("should throw BadRequest when booking already has a report", async () => {
        mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
        mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
          ...mockBooking,
          report: { id: "existing-report" },
        });

        await expect(service.reportBooking(defaultInput)).rejects.toMatchObject({
          code: ErrorCode.BadRequest,
          message: "This booking has already been reported",
        });
      });

      it("should throw BadRequest when booking has no attendees", async () => {
        mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
        mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
          ...mockBooking,
          attendees: [],
        });

        await expect(service.reportBooking(defaultInput)).rejects.toMatchObject({
          code: ErrorCode.BadRequest,
          message: "Booking has no attendees",
        });
      });

      it("should throw Forbidden when organizationId is provided and booking does not belong to org", async () => {
        mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
        mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
          ...mockBooking,
          eventType: { teamId: 99, team: { id: 99, parentId: 999 } },
          user: { profiles: [{ organizationId: 999 }] },
        });

        await expect(
          service.reportBooking({ ...defaultInput, organizationId: 42 })
        ).rejects.toMatchObject({
          code: ErrorCode.Forbidden,
          message: "Booking does not belong to this organization",
        });
      });

      it("should skip org check when organizationId is null", async () => {
        mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
        mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
        vi.mocked(handleCancelBooking).mockResolvedValue({
          success: true,
          message: "Cancelled",
          onlyRemovedAttendee: false,
          bookingUid: "test-booking-uid",
        });

        const result = await service.reportBooking({ ...defaultInput, organizationId: null });

        expect(result.success).toBe(true);
      });

      it("should allow reporting when booking belongs to org via team", async () => {
        mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
        mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
          ...mockBooking,
          eventType: { teamId: 42, team: { id: 42, parentId: 100 } },
          user: { profiles: [] },
        });
        vi.mocked(handleCancelBooking).mockResolvedValue({
          success: true,
          message: "Cancelled",
          onlyRemovedAttendee: false,
          bookingUid: "test-booking-uid",
        });

        const result = await service.reportBooking({ ...defaultInput, organizationId: 100 });

        expect(result.success).toBe(true);
      });

      it("should allow reporting when booking belongs to org via personal event type", async () => {
        mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
        mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
          ...mockBooking,
          eventType: null,
          user: { profiles: [{ organizationId: 42 }] },
        });
        vi.mocked(handleCancelBooking).mockResolvedValue({
          success: true,
          message: "Cancelled",
          onlyRemovedAttendee: false,
          bookingUid: "test-booking-uid",
        });

        const result = await service.reportBooking({ ...defaultInput, organizationId: 42 });

        expect(result.success).toBe(true);
      });
    });

    describe("EMAIL report type", () => {
      beforeEach(() => {
        mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      });

      it("should query by attendee email and cancel upcoming booking", async () => {
        mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
        vi.mocked(handleCancelBooking).mockResolvedValue({
          success: true,
          message: "Cancelled",
          onlyRemovedAttendee: false,
          bookingUid: "test-booking-uid",
        });

        const result = await service.reportBooking({ ...defaultInput, reportType: "EMAIL" });

        expect(mockBookingRepo.findUpcomingByAttendeeEmail).toHaveBeenCalledWith({
          attendeeEmail: "booker@spammer.com",
          hostUserId: 1,
        });
        expect(result.success).toBe(true);
        expect(result.message).toBe("Booking reported and cancelled successfully");
      });

      it("should use booker email for report creation", async () => {
        mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
        vi.mocked(handleCancelBooking).mockResolvedValue({
          success: true,
          message: "Cancelled",
          onlyRemovedAttendee: false,
          bookingUid: "test-booking-uid",
        });

        await service.reportBooking({ ...defaultInput, reportType: "EMAIL" });

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

        const result = await service.reportBooking({ ...defaultInput, reportType: "EMAIL" });

        expect(handleCancelBooking).toHaveBeenCalledTimes(3);
        expect(result.reportedCount).toBe(3);
      });

      it("should allow EMAIL reporting for seated events", async () => {
        mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
          ...mockBooking,
          seatsReferences: [{ referenceUid: "seat-1", attendee: { email: "booker@spammer.com" } }],
        });
        vi.mocked(handleCancelBooking).mockResolvedValue({ success: true, bookingId: 100 });

        const result = await service.reportBooking({ ...defaultInput, reportType: "EMAIL" });

        expect(result.success).toBe(true);
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

        await service.reportBooking({ ...defaultInput, reportType: "DOMAIN" });

        expect(mockBookingRepo.findUpcomingByAttendeeDomain).toHaveBeenCalledWith({
          domain: "spammer.com",
          hostUserId: 1,
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

        await service.reportBooking({ ...defaultInput, reportType: "DOMAIN" });

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

        const result = await service.reportBooking({ ...defaultInput, reportType: "DOMAIN" });

        expect(handleCancelBooking).toHaveBeenCalledTimes(2);
        expect(result.reportedCount).toBe(2);
      });

      it("should throw BadRequest for DOMAIN reporting on seated events", async () => {
        mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
          ...mockBooking,
          seatsReferences: [{ referenceUid: "seat-1", attendee: { email: "booker@spammer.com" } }],
        });

        await expect(service.reportBooking({ ...defaultInput, reportType: "DOMAIN" })).rejects.toMatchObject({
          code: ErrorCode.BadRequest,
          message: "Domain reporting is not available for seated events",
        });

        expect(handleCancelBooking).not.toHaveBeenCalled();
      });

      it("should throw BadRequest for free email domains", async () => {
        mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
          ...mockBooking,
          attendees: [{ email: "booker@gmail.com" }],
        });
        vi.mocked(checkIfFreeEmailDomain).mockResolvedValue(true);

        await expect(service.reportBooking({ ...defaultInput, reportType: "DOMAIN" })).rejects.toMatchObject({
          code: ErrorCode.BadRequest,
          message: "Cannot report by domain for free email providers",
        });

        expect(handleCancelBooking).not.toHaveBeenCalled();

        vi.mocked(checkIfFreeEmailDomain).mockResolvedValue(false);
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

        const result = await service.reportBooking(defaultInput);

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

        const result = await service.reportBooking(defaultInput);

        // Original + 1 unreported additional (skip the already-reported one)
        expect(handleCancelBooking).toHaveBeenCalledTimes(2);
        expect(result.reportedCount).toBe(2);
      });

      it("should mark cancelled flag only for bookings that were actually cancelled", async () => {
        mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
        mockBookingRepo.findUpcomingByAttendeeEmail.mockResolvedValue([
          { uid: "additional-1", report: null, attendees: [{ email: "booker@spammer.com" }] },
        ]);
        vi.mocked(handleCancelBooking)
          .mockResolvedValueOnce({
            success: true,
            message: "Cancelled",
            onlyRemovedAttendee: false,
            bookingUid: "test-booking-uid",
          })
          .mockRejectedValueOnce(new Error("Cancellation failed"));

        const result = await service.reportBooking(defaultInput);

        expect(result.success).toBe(true);
        expect(result.reportedCount).toBe(2);

        expect(mockReportRepo.createReport).toHaveBeenCalledWith(
          expect.objectContaining({
            bookingUid: "test-booking-uid",
            cancelled: true,
          })
        );
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

        const result = await service.reportBooking(defaultInput);

        expect(result.success).toBe(true);
        expect(result.message).toBe("Booking reported successfully");
      });

      it("should pass skipNotifications and skipCancellationReasonValidation to handleCancelBooking", async () => {
        mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
        vi.mocked(handleCancelBooking).mockResolvedValue({
          success: true,
          message: "Cancelled",
          onlyRemovedAttendee: false,
          bookingUid: "test-booking-uid",
        });

        await service.reportBooking(defaultInput);

        expect(handleCancelBooking).toHaveBeenCalledWith(
          expect.objectContaining({
            bookingData: expect.objectContaining({
              skipCancellationReasonValidation: true,
              cancelledBy: "user@example.com",
            }),
            skipNotifications: true,
            actionSource: "WEBAPP",
          })
        );
      });
    });

    describe("host user scoping", () => {
      beforeEach(() => {
        mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      });

      it("should use booking.userId as hostUserId when available", async () => {
        mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
          ...mockBooking,
          userId: 99,
        });
        vi.mocked(handleCancelBooking).mockResolvedValue({
          success: true,
          message: "Cancelled",
          onlyRemovedAttendee: false,
          bookingUid: "test-booking-uid",
        });

        await service.reportBooking({ ...defaultInput, reportType: "EMAIL" });

        expect(mockBookingRepo.findUpcomingByAttendeeEmail).toHaveBeenCalledWith({
          attendeeEmail: "booker@spammer.com",
          hostUserId: 99,
        });
      });

      it("should fall back to userId when booking.userId is null", async () => {
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

        await service.reportBooking({ ...defaultInput, reportType: "EMAIL" });

        expect(mockBookingRepo.findUpcomingByAttendeeEmail).toHaveBeenCalledWith({
          attendeeEmail: "booker@spammer.com",
          hostUserId: 1,
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

        const result = await service.reportBooking(defaultInput);

        expect(result.message).toBe("3 bookings reported and cancelled successfully");
        expect(result.reportedCount).toBe(3);
      });

      it("should return 'No reports created' when createReport fails for all bookings", async () => {
        mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
        vi.mocked(handleCancelBooking).mockResolvedValue({
          success: true,
          message: "Cancelled",
          onlyRemovedAttendee: false,
          bookingUid: "test-booking-uid",
        });
        mockReportRepo.createReport.mockRejectedValue(new Error("DB error"));

        const result = await service.reportBooking(defaultInput);

        expect(result.success).toBe(false);
        expect(result.message).toBe("No reports created");
        expect(result.reportedCount).toBe(0);
      });
    });

    describe("report creation", () => {
      beforeEach(() => {
        mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
      });

      it("should pass organizationId to createReport", async () => {
        mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
          ...mockBooking,
          user: { profiles: [{ organizationId: 42 }] },
        });
        vi.mocked(handleCancelBooking).mockResolvedValue({
          success: true,
          message: "Cancelled",
          onlyRemovedAttendee: false,
          bookingUid: "test-booking-uid",
        });

        await service.reportBooking({ ...defaultInput, organizationId: 42 });

        expect(mockReportRepo.createReport).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: 42,
            reportedById: 1,
            reason: "SPAM",
          })
        );
      });

      it("should pass description to createReport when provided", async () => {
        mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
        vi.mocked(handleCancelBooking).mockResolvedValue({
          success: true,
          message: "Cancelled",
          onlyRemovedAttendee: false,
          bookingUid: "test-booking-uid",
        });

        await service.reportBooking({ ...defaultInput, description: "Suspicious activity" });

        expect(mockReportRepo.createReport).toHaveBeenCalledWith(
          expect.objectContaining({
            description: "Suspicious activity",
          })
        );
      });
    });
  });

  describe("validateOrgBooking", () => {
    const orgId = 10;

    const mockOrgBooking = {
      ...mockBooking,
      eventType: {
        teamId: 20,
        team: { id: 20, parentId: orgId },
      },
      user: { profiles: [] },
    };

    const validateInput = {
      bookingUid: "test-booking-uid",
      organizationId: orgId,
      reportType: "EMAIL" as const,
    };

    it("should throw NotFound when booking does not exist", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(null);

      await expect(service.validateOrgBooking(validateInput)).rejects.toMatchObject({
        code: ErrorCode.NotFound,
      });
    });

    it("should throw Forbidden when booking does not belong to org", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
        ...mockOrgBooking,
        eventType: { teamId: 99, team: { id: 99, parentId: 999 } },
        user: { profiles: [{ organizationId: 999 }] },
      });

      await expect(service.validateOrgBooking(validateInput)).rejects.toMatchObject({
        code: ErrorCode.Forbidden,
        message: "Booking does not belong to this organization",
      });
    });

    it("should throw Forbidden when booking has no event type team and user not in org", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
        ...mockOrgBooking,
        eventType: null,
        user: { profiles: [] },
      });

      await expect(service.validateOrgBooking(validateInput)).rejects.toMatchObject({
        code: ErrorCode.Forbidden,
      });
    });

    it("should accept personal event type when host user has profile in org", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
        ...mockOrgBooking,
        eventType: null,
        user: { profiles: [{ organizationId: orgId }] },
      });

      const result = await service.validateOrgBooking(validateInput);

      expect(result.booking).toBeDefined();
      expect(result.bookerEmail).toBe("booker@spammer.com");
    });

    it("should accept personal event type with no team when user has profile in org", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
        ...mockOrgBooking,
        eventType: { teamId: null, team: null },
        user: { profiles: [{ organizationId: orgId }] },
      });

      const result = await service.validateOrgBooking(validateInput);

      expect(result.booking).toBeDefined();
      expect(result.bookerEmail).toBe("booker@spammer.com");
    });

    it("should throw BadRequest when booking has no attendees", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
        ...mockOrgBooking,
        attendees: [],
      });

      await expect(service.validateOrgBooking(validateInput)).rejects.toMatchObject({
        code: ErrorCode.BadRequest,
        message: "Booking has no attendees",
      });
    });

    it("should throw BadRequest for DOMAIN reporting on seated events", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
        ...mockOrgBooking,
        seatsReferences: [{ referenceUid: "seat-1", attendee: { email: "booker@spammer.com" } }],
      });

      await expect(
        service.validateOrgBooking({ ...validateInput, reportType: "DOMAIN" })
      ).rejects.toMatchObject({
        code: ErrorCode.BadRequest,
        message: "Domain reporting is not available for seated events",
      });
    });

    it("should throw BadRequest for free email domains with DOMAIN type", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
        ...mockOrgBooking,
        attendees: [{ email: "booker@gmail.com" }],
      });
      vi.mocked(checkIfFreeEmailDomain).mockResolvedValueOnce(true);

      await expect(
        service.validateOrgBooking({ ...validateInput, reportType: "DOMAIN" })
      ).rejects.toMatchObject({
        code: ErrorCode.BadRequest,
        message: "Cannot report by domain for free email providers",
      });
    });

    it("should accept booking that belongs to org directly (team.id = orgId)", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
        ...mockOrgBooking,
        eventType: { teamId: orgId, team: { id: orgId, parentId: null } },
        user: { profiles: [] },
      });

      const result = await service.validateOrgBooking(validateInput);

      expect(result.booking).toBeDefined();
      expect(result.bookerEmail).toBe("booker@spammer.com");
    });

    it("should return booking and bookerEmail on success", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockOrgBooking);

      const result = await service.validateOrgBooking(validateInput);

      expect(result.booking).toEqual(mockOrgBooking);
      expect(result.bookerEmail).toBe("booker@spammer.com");
    });
  });

  describe("cancelReportedBookings", () => {
    it("should return empty set when no bookingUids provided", async () => {
      const result = await service.cancelReportedBookings({
        bookingUids: [],
        originalBooking: mockBooking as never,
        userEmail: "user@example.com",
        userId: 1,
        actionSource: "WEBAPP",
      });

      expect(result.cancelledUids.size).toBe(0);
      expect(handleCancelBooking).not.toHaveBeenCalled();
    });

    it("should cancel all provided bookings in parallel", async () => {
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "uid-1",
      });

      const result = await service.cancelReportedBookings({
        bookingUids: ["uid-1", "uid-2", "uid-3"],
        originalBooking: mockBooking as never,
        userEmail: "user@example.com",
        userId: 1,
        actionSource: "WEBAPP",
      });

      expect(handleCancelBooking).toHaveBeenCalledTimes(3);
      expect(result.cancelledUids).toEqual(new Set(["uid-1", "uid-2", "uid-3"]));
    });

    it("should track which cancellations succeeded and which failed", async () => {
      vi.mocked(handleCancelBooking)
        .mockResolvedValueOnce({
          success: true,
          message: "Cancelled",
          onlyRemovedAttendee: false,
          bookingUid: "uid-1",
        })
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce({
          success: true,
          message: "Cancelled",
          onlyRemovedAttendee: false,
          bookingUid: "uid-3",
        });

      const result = await service.cancelReportedBookings({
        bookingUids: ["uid-1", "uid-2", "uid-3"],
        originalBooking: mockBooking as never,
        userEmail: "user@example.com",
        userId: 1,
        actionSource: "WEBAPP",
      });

      expect(result.cancelledUids).toEqual(new Set(["uid-1", "uid-3"]));
      expect(result.cancelledUids.has("uid-2")).toBe(false);
    });

    it("should include seatReferenceUid for the original booking in seated events", async () => {
      const seatedBooking = {
        ...mockBooking,
        seatsReferences: [
          { referenceUid: "seat-ref-1", attendee: { email: "user@example.com" } },
          { referenceUid: "seat-ref-2", attendee: { email: "other@example.com" } },
        ],
      };

      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      await service.cancelReportedBookings({
        bookingUids: ["test-booking-uid", "other-uid"],
        originalBooking: seatedBooking as never,
        userEmail: "user@example.com",
        userId: 1,
        actionSource: "WEBAPP",
      });

      // Original booking should include seatReferenceUid
      expect(handleCancelBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingData: expect.objectContaining({
            uid: "test-booking-uid",
            seatReferenceUid: "seat-ref-1",
          }),
        })
      );

      // Other booking should NOT include seatReferenceUid
      expect(handleCancelBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingData: expect.not.objectContaining({
            seatReferenceUid: expect.anything(),
          }),
        })
      );
    });

    it("should match seat by case-insensitive email", async () => {
      const seatedBooking = {
        ...mockBooking,
        seatsReferences: [{ referenceUid: "seat-ref-1", attendee: { email: "User@Example.COM" } }],
      };

      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      await service.cancelReportedBookings({
        bookingUids: ["test-booking-uid"],
        originalBooking: seatedBooking as never,
        userEmail: "user@example.com",
        userId: 1,
        actionSource: "WEBAPP",
      });

      expect(handleCancelBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingData: expect.objectContaining({
            seatReferenceUid: "seat-ref-1",
          }),
        })
      );
    });

    it("should resolve skipCrmDeletion from org settings when organizationId is provided", async () => {
      mockOrganizationSettingsRepo.getBlocklistSettings.mockResolvedValue({
        skipCrmOnBookingReport: true,
      });
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "uid-1",
      });

      await service.cancelReportedBookings({
        bookingUids: ["uid-1"],
        originalBooking: mockBooking as never,
        userEmail: "user@example.com",
        userId: 1,
        actionSource: "WEBAPP",
        organizationId: 42,
      });

      expect(mockOrganizationSettingsRepo.getBlocklistSettings).toHaveBeenCalledWith(42);
      expect(handleCancelBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          skipCrmDeletion: true,
        })
      );
    });

    it("should default skipCrmDeletion to false when organizationId is not provided", async () => {
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "uid-1",
      });

      await service.cancelReportedBookings({
        bookingUids: ["uid-1"],
        originalBooking: mockBooking as never,
        userEmail: "user@example.com",
        userId: 1,
        actionSource: "WEBAPP",
      });

      expect(mockOrganizationSettingsRepo.getBlocklistSettings).not.toHaveBeenCalled();
      expect(handleCancelBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          skipCrmDeletion: false,
        })
      );
    });

    it("should default skipCrmDeletion to false when org settings not found", async () => {
      mockOrganizationSettingsRepo.getBlocklistSettings.mockResolvedValue(null);
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "uid-1",
      });

      await service.cancelReportedBookings({
        bookingUids: ["uid-1"],
        originalBooking: mockBooking as never,
        userEmail: "user@example.com",
        userId: 1,
        actionSource: "WEBAPP",
        organizationId: 42,
      });

      expect(handleCancelBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          skipCrmDeletion: false,
        })
      );
    });

    it("should pass skipCrmDeletion=false when org has skipCrmOnBookingReport disabled", async () => {
      mockOrganizationSettingsRepo.getBlocklistSettings.mockResolvedValue({
        skipCrmOnBookingReport: false,
      });
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "uid-1",
      });

      await service.cancelReportedBookings({
        bookingUids: ["uid-1"],
        originalBooking: mockBooking as never,
        userEmail: "user@example.com",
        userId: 1,
        actionSource: "WEBAPP",
        organizationId: 42,
      });

      expect(handleCancelBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          skipCrmDeletion: false,
        })
      );
    });
  });

  describe("skipCrmDeletion integration via reportBooking", () => {
    beforeEach(() => {
      mockBookingAccessService.doesUserIdHaveAccessToBooking.mockResolvedValue(true);
    });

    it("should pass organizationId through to cancelReportedBookings which resolves skipCrmDeletion", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue({
        ...mockBooking,
        user: { profiles: [{ organizationId: 42 }] },
      });
      mockOrganizationSettingsRepo.getBlocklistSettings.mockResolvedValue({
        skipCrmOnBookingReport: true,
      });
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      await service.reportBooking({ ...defaultInput, organizationId: 42 });

      expect(mockOrganizationSettingsRepo.getBlocklistSettings).toHaveBeenCalledWith(42);
      expect(handleCancelBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          skipCrmDeletion: true,
        })
      );
    });

    it("should not fetch org settings when organizationId is null", async () => {
      mockBookingRepo.findByUidIncludeReportAndEventType.mockResolvedValue(mockBooking);
      vi.mocked(handleCancelBooking).mockResolvedValue({
        success: true,
        message: "Cancelled",
        onlyRemovedAttendee: false,
        bookingUid: "test-booking-uid",
      });

      await service.reportBooking({ ...defaultInput, organizationId: null });

      expect(mockOrganizationSettingsRepo.getBlocklistSettings).not.toHaveBeenCalled();
      expect(handleCancelBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          skipCrmDeletion: false,
        })
      );
    });
  });
});

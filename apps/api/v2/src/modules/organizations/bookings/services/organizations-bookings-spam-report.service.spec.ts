import { BookingReportReason, BookingReportStatus, BookingStatus, WatchlistType } from "@calcom/prisma/enums";
import { BadRequestException, ForbiddenException, Logger, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaBookingReportRepository } from "@/lib/repositories/prisma-booking-report.repository";
import { PrismaWatchlistRepository } from "@/lib/repositories/prisma-watchlist.repository";
import { OrganizationsBookingsSpamReportService } from "@/modules/organizations/bookings/services/organizations-bookings-spam-report.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";

const mockCancelResult = {
  success: true as const,
  onlyRemovedAttendee: false as const,
  bookingId: 1,
  bookingUid: "test-uid",
  message: "Booking cancelled",
  isPlatformManagedUserBooking: false,
};

const mockHandleCancelBooking = jest.fn().mockResolvedValue(mockCancelResult);
const mockDoesUserIdHaveAccessToBooking = jest.fn().mockResolvedValue(true);
const mockNormalizeEmail = jest.fn().mockImplementation((email: string) => email.toLowerCase());

jest.mock("@calcom/platform-libraries", () => ({
  handleCancelBooking: (...args: unknown[]) => mockHandleCancelBooking(...args),
  BookingAccessService: class {
    doesUserIdHaveAccessToBooking(...args: unknown[]) {
      return mockDoesUserIdHaveAccessToBooking(...args);
    }
  },
  normalizeWatchlistEmail: (email: string) => mockNormalizeEmail(email),
}));

describe("OrganizationsBookingsSpamReportService", () => {
  let service: OrganizationsBookingsSpamReportService;
  let mockBookingRepo: {
    findByUidIncludeReport: jest.Mock;
    getActiveRecurringBookingsFromDate: jest.Mock;
  };
  let mockBookingReportRepo: {
    createReport: jest.Mock;
    findPendingReportsByEmail: jest.Mock;
    bulkLinkWatchlistWithStatus: jest.Mock;
  };
  let mockWatchlistRepo: {
    createEntryFromReport: jest.Mock;
  };
  let mockPrismaRead: {
    prisma: {
      booking: {
        findMany: jest.Mock;
      };
    };
  };

  const orgId = 1;
  const userId = 42;
  const userEmail = "admin@org.com";
  const bookingUid = "booking-uid-123";

  beforeEach(async () => {
    mockBookingRepo = {
      findByUidIncludeReport: jest.fn(),
      getActiveRecurringBookingsFromDate: jest.fn(),
    };

    mockBookingReportRepo = {
      createReport: jest.fn().mockResolvedValue({ id: "report-1" }),
      findPendingReportsByEmail: jest.fn().mockResolvedValue([]),
      bulkLinkWatchlistWithStatus: jest.fn().mockResolvedValue(undefined),
    };

    mockWatchlistRepo = {
      createEntryFromReport: jest.fn().mockResolvedValue({
        watchlistEntry: { id: "watchlist-1" },
        value: "spammer@test.com",
      }),
    };

    mockPrismaRead = {
      prisma: {
        booking: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsBookingsSpamReportService,
        { provide: PrismaReadService, useValue: mockPrismaRead },
        { provide: PrismaBookingRepository, useValue: mockBookingRepo },
        { provide: PrismaBookingReportRepository, useValue: mockBookingReportRepo },
        { provide: PrismaWatchlistRepository, useValue: mockWatchlistRepo },
      ],
    }).compile();

    service = module.get<OrganizationsBookingsSpamReportService>(OrganizationsBookingsSpamReportService);

    jest.spyOn(Logger.prototype, "warn").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  function createMockBooking(overrides: Record<string, unknown> = {}) {
    return {
      id: 1,
      uid: bookingUid,
      startTime: new Date("2026-04-01"),
      status: BookingStatus.ACCEPTED,
      recurringEventId: null,
      attendees: [{ email: "spammer@test.com" }],
      report: null,
      ...overrides,
    };
  }

  describe("reportBookingAsSpam", () => {
    it("reports a booking as spam, adds email to blocklist, and cancels upcoming bookings", async () => {
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue(createMockBooking());
      mockPrismaRead.prisma.booking.findMany.mockResolvedValue([
        { uid: "upcoming-1" },
        { uid: "upcoming-2" },
      ]);

      const result = await service.reportBookingAsSpam({
        bookingUid,
        orgId,
        userId,
        userEmail,
        description: "Spam booking",
      });

      expect(result.reportedCount).toBe(1);
      expect(result.blocklisted).toBe(true);
      expect(result.cancelledCount).toBe(2);
      expect(result.bookingUid).toBe(bookingUid);

      expect(mockBookingReportRepo.createReport).toHaveBeenCalledWith({
        bookingUid,
        bookerEmail: "spammer@test.com",
        reportedById: userId,
        reason: BookingReportReason.SPAM,
        description: "Spam booking",
        cancelled: false,
        organizationId: orgId,
      });

      expect(mockWatchlistRepo.createEntryFromReport).toHaveBeenCalledWith({
        type: WatchlistType.EMAIL,
        value: "spammer@test.com",
        organizationId: orgId,
        isGlobal: false,
        userId,
        description: "Spam booking",
      });

      expect(mockHandleCancelBooking).toHaveBeenCalledTimes(2);
    });

    it("throws ForbiddenException when user has no access to booking", async () => {
      mockDoesUserIdHaveAccessToBooking.mockResolvedValueOnce(false);

      await expect(service.reportBookingAsSpam({ bookingUid, orgId, userId, userEmail })).rejects.toThrow(
        ForbiddenException
      );
    });

    it("throws NotFoundException when booking does not exist", async () => {
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue(null);

      await expect(service.reportBookingAsSpam({ bookingUid, orgId, userId, userEmail })).rejects.toThrow(
        NotFoundException
      );
    });

    it("throws BadRequestException when booking is already reported", async () => {
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue(
        createMockBooking({ report: { id: "existing-report" } })
      );

      await expect(service.reportBookingAsSpam({ bookingUid, orgId, userId, userEmail })).rejects.toThrow(
        BadRequestException
      );
    });

    it("throws BadRequestException when booking has no attendees", async () => {
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue(createMockBooking({ attendees: [] }));

      await expect(service.reportBookingAsSpam({ bookingUid, orgId, userId, userEmail })).rejects.toThrow(
        BadRequestException
      );
    });

    it("reports all remaining recurring bookings when booking is recurring", async () => {
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue(
        createMockBooking({ recurringEventId: "recurring-123" })
      );
      mockBookingRepo.getActiveRecurringBookingsFromDate.mockResolvedValue([
        { id: 1, uid: "rec-1" },
        { id: 2, uid: "rec-2" },
        { id: 3, uid: "rec-3" },
      ]);

      const result = await service.reportBookingAsSpam({ bookingUid, orgId, userId, userEmail });

      expect(result.reportedCount).toBe(3);
      expect(mockBookingReportRepo.createReport).toHaveBeenCalledTimes(3);
    });

    it("links pending reports to watchlist entry when blocklisting succeeds", async () => {
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue(createMockBooking());
      mockBookingReportRepo.findPendingReportsByEmail.mockResolvedValue([
        { id: "report-1" },
        { id: "report-2" },
      ]);

      await service.reportBookingAsSpam({ bookingUid, orgId, userId, userEmail });

      expect(mockBookingReportRepo.bulkLinkWatchlistWithStatus).toHaveBeenCalledWith({
        links: [
          { reportId: "report-1", watchlistId: "watchlist-1" },
          { reportId: "report-2", watchlistId: "watchlist-1" },
        ],
        status: BookingReportStatus.BLOCKED,
      });
    });

    it("continues gracefully when blocklist creation fails", async () => {
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue(createMockBooking());
      mockWatchlistRepo.createEntryFromReport.mockRejectedValue(new Error("DB error"));

      const result = await service.reportBookingAsSpam({ bookingUid, orgId, userId, userEmail });

      expect(result.blocklisted).toBe(false);
      expect(result.reportedCount).toBe(1);
    });

    it("continues gracefully when cancelling a booking fails", async () => {
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue(createMockBooking());
      mockPrismaRead.prisma.booking.findMany.mockResolvedValue([
        { uid: "upcoming-1" },
        { uid: "upcoming-2" },
      ]);
      mockHandleCancelBooking
        .mockRejectedValueOnce(new Error("Cancel failed"))
        .mockResolvedValueOnce(mockCancelResult);

      const result = await service.reportBookingAsSpam({ bookingUid, orgId, userId, userEmail });

      expect(result.cancelledCount).toBe(1);
      expect(mockHandleCancelBooking).toHaveBeenCalledTimes(2);
    });

    it("uses default description when none is provided", async () => {
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue(createMockBooking());

      await service.reportBookingAsSpam({ bookingUid, orgId, userId, userEmail });

      expect(mockWatchlistRepo.createEntryFromReport).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Reported as spam via API",
        })
      );
    });

    it("passes correct cancellation params to handleCancelBooking", async () => {
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue(createMockBooking());
      mockPrismaRead.prisma.booking.findMany.mockResolvedValue([{ uid: "upcoming-1" }]);

      await service.reportBookingAsSpam({ bookingUid, orgId, userId, userEmail });

      expect(mockHandleCancelBooking).toHaveBeenCalledWith({
        bookingData: {
          uid: "upcoming-1",
          cancelledBy: userEmail,
          skipCancellationReasonValidation: true,
        },
        userId,
        impersonatedByUserUuid: null,
        actionSource: "API_V2",
      });
    });

    it("continues when report creation fails for individual bookings", async () => {
      mockBookingRepo.findByUidIncludeReport.mockResolvedValue(
        createMockBooking({ recurringEventId: "recurring-123" })
      );
      mockBookingRepo.getActiveRecurringBookingsFromDate.mockResolvedValue([
        { id: 1, uid: "rec-1" },
        { id: 2, uid: "rec-2" },
      ]);
      mockBookingReportRepo.createReport
        .mockRejectedValueOnce(new Error("Report creation failed"))
        .mockResolvedValueOnce({ id: "report-2" });

      const result = await service.reportBookingAsSpam({ bookingUid, orgId, userId, userEmail });

      expect(result.reportedCount).toBe(1);
    });
  });
});

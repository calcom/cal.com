import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAddToWatchlistByEmail = vi.fn().mockResolvedValue({
  success: true,
  message: "Added",
  addedCount: 1,
  skippedCount: 0,
  results: [],
});

vi.mock("@calcom/platform-libraries/bookings", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;

  class MockOrganizationWatchlistOperationsService {
    addToWatchlistByEmail = mockAddToWatchlistByEmail;
    constructor(_deps: Record<string, unknown>) {}
  }

  return {
    ...actual,
    OrganizationWatchlistOperationsService: MockOrganizationWatchlistOperationsService,
  };
});

import { OrganizationsBookingsBlockService } from "./organizations-bookings-block.service";

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
  };
}

function createMockWatchlistRepo() {
  return {} as never;
}

function createMockBookingReportRepo() {
  return {} as never;
}

const defaultInput = {
  bookingUid: "test-booking-uid",
  blockType: "EMAIL" as const,
  userId: 1,
  userEmail: "admin@org.com",
  organizationId: 5,
  actionSource: "API_V2" as const,
};

describe("OrganizationsBookingsBlockService", () => {
  let service: OrganizationsBookingsBlockService;
  let mockReportService: ReturnType<typeof createMockBookingReportService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReportService = createMockBookingReportService();
    service = new OrganizationsBookingsBlockService(
      mockReportService as never,
      createMockWatchlistRepo(),
      createMockBookingReportRepo()
    );
  });

  describe("block - validation", () => {
    it("should call validateOrgBooking with correct params", async () => {
      await service.block(defaultInput);

      expect(mockReportService.validateOrgBooking).toHaveBeenCalledWith({
        bookingUid: "test-booking-uid",
        organizationId: 5,
        reportType: "EMAIL",
      });
    });
  });

  describe("block - watchlist", () => {
    it("should add email to watchlist with EMAIL type", async () => {
      await service.block(defaultInput);

      expect(mockAddToWatchlistByEmail).toHaveBeenCalledWith({
        email: "booker@spammer.com",
        type: "EMAIL",
        userId: 1,
      });
    });

    it("should add domain to watchlist with DOMAIN type", async () => {
      await service.block({ ...defaultInput, blockType: "DOMAIN" });

      expect(mockAddToWatchlistByEmail).toHaveBeenCalledWith({
        email: "booker@spammer.com",
        type: "DOMAIN",
        userId: 1,
      });
    });
  });

  describe("block - cancellation", () => {
    it("should find and cancel upcoming org bookings", async () => {
      mockReportService.findUpcomingUnreportedOrgBookings.mockResolvedValue([
        { uid: "org-booking-1", report: null, attendees: [{ email: "booker@spammer.com" }] },
      ]);
      mockReportService.cancelReportedBookings.mockResolvedValue({
        cancelledUids: new Set(["test-booking-uid", "org-booking-1"]),
      });

      const result = await service.block(defaultInput);

      expect(mockReportService.findUpcomingUnreportedOrgBookings).toHaveBeenCalledWith({
        reportType: "EMAIL",
        bookerEmail: "booker@spammer.com",
        organizationId: 5,
      });
      expect(mockReportService.cancelReportedBookings).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingUids: expect.arrayContaining(["test-booking-uid", "org-booking-1"]),
        })
      );
      expect(result.cancelledCount).toBe(2);
    });

    it("should not cancel past bookings", async () => {
      const yesterday = new Date(Date.now() - 86400000);
      mockReportService.validateOrgBooking.mockResolvedValue({
        booking: { ...mockBooking, startTime: yesterday, status: "ACCEPTED" },
        bookerEmail: "booker@spammer.com",
      });

      await service.block(defaultInput);

      const cancelCall = mockReportService.cancelReportedBookings.mock.calls[0][0];
      expect(cancelCall.bookingUids).not.toContain("test-booking-uid");
    });
  });

  describe("block - results", () => {
    it("should return correct result with cancelled bookings", async () => {
      mockReportService.cancelReportedBookings.mockResolvedValue({
        cancelledUids: new Set(["test-booking-uid"]),
      });

      const result = await service.block(defaultInput);

      expect(result).toEqual({
        success: true,
        message: "Added to blocklist and 1 booking cancelled",
        bookingUid: "test-booking-uid",
        cancelledCount: 1,
        blockedValue: "booker@spammer.com",
      });
    });

    it("should return correct result with multiple cancelled bookings", async () => {
      mockReportService.findUpcomingUnreportedOrgBookings.mockResolvedValue([
        { uid: "org-booking-1", report: null, attendees: [{ email: "booker@spammer.com" }] },
      ]);
      mockReportService.cancelReportedBookings.mockResolvedValue({
        cancelledUids: new Set(["test-booking-uid", "org-booking-1"]),
      });

      const result = await service.block(defaultInput);

      expect(result.message).toBe("Added to blocklist and 2 bookings cancelled");
      expect(result.cancelledCount).toBe(2);
    });

    it("should return correct result with no cancelled bookings", async () => {
      const result = await service.block(defaultInput);

      expect(result).toEqual({
        success: true,
        message: "Added to blocklist",
        bookingUid: "test-booking-uid",
        cancelledCount: 0,
        blockedValue: "booker@spammer.com",
      });
    });

    it("should return domain as blockedValue for DOMAIN block type", async () => {
      const result = await service.block({ ...defaultInput, blockType: "DOMAIN" });

      expect(result.blockedValue).toBe("spammer.com");
    });

    it("should return email as blockedValue for EMAIL block type", async () => {
      const result = await service.block(defaultInput);

      expect(result.blockedValue).toBe("booker@spammer.com");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import { BookingReportReason } from "@calcom/prisma/enums";

import { listBookingReportsHandler } from "./listBookingReports.handler";

vi.mock("@calcom/lib/server/repository/bookingReport");

describe("listBookingReportsHandler", () => {
  const mockUser = {
    id: 1,
    email: "admin@example.com",
    organizationId: 100,
  };

  const mockReportData = {
    rows: [
      {
        id: "report-1",
        bookingId: 1,
        bookerEmail: "user1@example.com",
        reportedById: 1,
        reason: BookingReportReason.SPAM,
        description: null,
        cancelled: false,
        createdAt: new Date("2025-01-01"),
        watchlistId: null,
        reporter: { id: 1, name: "Admin", email: "admin@example.com" },
        booking: {
          id: 1,
          startTime: new Date(),
          endTime: new Date(),
          title: "Test Booking",
          uid: "uid-1",
        },
        watchlist: null,
      },
      {
        id: "report-2",
        bookingId: 2,
        bookerEmail: "user2@example.com",
        reportedById: 1,
        reason: BookingReportReason.DONT_KNOW_PERSON,
        description: "Unknown person",
        cancelled: true,
        createdAt: new Date("2025-01-02"),
        watchlistId: "watchlist-123",
        reporter: { id: 1, name: "Admin", email: "admin@example.com" },
        booking: {
          id: 2,
          startTime: new Date(),
          endTime: new Date(),
          title: "Test Booking 2",
          uid: "uid-2",
        },
        watchlist: {
          id: "watchlist-123",
          type: "EMAIL" as const,
          value: "user2@example.com",
          action: "REPORT" as const,
          description: null,
        },
      },
    ],
    meta: { totalRowCount: 2 },
  };

  const mockReportRepo = {
    findAllReportedBookings: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PrismaBookingReportRepository).mockImplementation(() => mockReportRepo as any);
  });

  describe("access control", () => {
    it("should throw FORBIDDEN when user is not part of an organization", async () => {
      await expect(
        listBookingReportsHandler({
          ctx: { user: { ...mockUser, organizationId: undefined } },
          input: {
            limit: 10,
            offset: 0,
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You must be part of an organization to view booking reports",
      });

      expect(mockReportRepo.findAllReportedBookings).not.toHaveBeenCalled();
    });
  });

  describe("successful listing", () => {
    it("should return paginated booking reports with correct parameters", async () => {
      mockReportRepo.findAllReportedBookings.mockResolvedValue(mockReportData);

      const result = await listBookingReportsHandler({
        ctx: { user: mockUser },
        input: {
          limit: 10,
          offset: 0,
        },
      });

      expect(result).toEqual(mockReportData);
      expect(result.rows).toHaveLength(2);
      expect(result.meta.totalRowCount).toBe(2);
      expect(mockReportRepo.findAllReportedBookings).toHaveBeenCalledWith({
        organizationId: 100,
        skip: 0,
        take: 10,
        searchTerm: undefined,
        filters: undefined,
      });
    });

    it("should pass search term to repository", async () => {
      mockReportRepo.findAllReportedBookings.mockResolvedValue(mockReportData);

      await listBookingReportsHandler({
        ctx: { user: mockUser },
        input: {
          limit: 10,
          offset: 0,
          searchTerm: "spam@example.com",
        },
      });

      expect(mockReportRepo.findAllReportedBookings).toHaveBeenCalledWith({
        organizationId: 100,
        skip: 0,
        take: 10,
        searchTerm: "spam@example.com",
        filters: undefined,
      });
    });

    it("should pass filters to repository", async () => {
      mockReportRepo.findAllReportedBookings.mockResolvedValue(mockReportData);

      const filters = {
        reason: [BookingReportReason.SPAM, BookingReportReason.DONT_KNOW_PERSON],
        cancelled: true,
        hasWatchlist: false,
      };

      await listBookingReportsHandler({
        ctx: { user: mockUser },
        input: {
          limit: 20,
          offset: 10,
          filters,
        },
      });

      expect(mockReportRepo.findAllReportedBookings).toHaveBeenCalledWith({
        organizationId: 100,
        skip: 10,
        take: 20,
        searchTerm: undefined,
        filters,
      });
    });

    it("should return rows and meta from repository", async () => {
      const customData = {
        rows: [mockReportData.rows[0]],
        meta: { totalRowCount: 1 },
      };
      mockReportRepo.findAllReportedBookings.mockResolvedValue(customData);

      const result = await listBookingReportsHandler({
        ctx: { user: mockUser },
        input: {
          limit: 10,
          offset: 0,
        },
      });

      expect(result.rows).toHaveLength(1);
      expect(result.meta.totalRowCount).toBe(1);
    });
  });

  describe("pagination", () => {
    it("should correctly pass limit and offset to repository", async () => {
      mockReportRepo.findAllReportedBookings.mockResolvedValue({
        rows: [],
        meta: { totalRowCount: 0 },
      });

      await listBookingReportsHandler({
        ctx: { user: mockUser },
        input: {
          limit: 50,
          offset: 100,
        },
      });

      expect(mockReportRepo.findAllReportedBookings).toHaveBeenCalledWith({
        organizationId: 100,
        skip: 100,
        take: 50,
        searchTerm: undefined,
        filters: undefined,
      });
    });
  });
});

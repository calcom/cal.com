import { describe, it, expect, vi, beforeEach } from "vitest";

import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { prisma } from "@calcom/prisma";
import { WatchlistType, WatchlistAction, BookingReportReason } from "@calcom/prisma/enums";

import { addToWatchlistHandler } from "./addToWatchlist.handler";

vi.mock("@calcom/lib/server/repository/bookingReport");
vi.mock("@calcom/lib/server/repository/watchlist.repository");
vi.mock("@calcom/prisma", () => ({
  prisma: {
    bookingReport: {
      findUnique: vi.fn(),
    },
  },
}));

describe("addToWatchlistHandler (Admin)", () => {
  const mockUser = {
    id: 1,
    email: "admin@example.com",
    role: "ADMIN" as const,
  };

  const mockReports = [
    {
      id: "report-1",
      bookingId: 1,
      bookerEmail: "spammer@example.com",
      reportedById: 1,
      reason: BookingReportReason.SPAM,
      description: null,
      cancelled: false,
      createdAt: new Date(),
      watchlistId: null,
      reporter: { id: 1, name: "Admin", email: "admin@example.com" },
      booking: {
        id: 1,
        startTime: new Date(),
        endTime: new Date(),
        title: "Test Booking",
        uid: "booking-uid-1",
      },
      watchlist: null,
    },
    {
      id: "report-2",
      bookingId: 2,
      bookerEmail: "user@spammer.com",
      reportedById: 1,
      reason: BookingReportReason.SPAM,
      description: null,
      cancelled: false,
      createdAt: new Date(),
      watchlistId: null,
      reporter: { id: 1, name: "Admin", email: "admin@example.com" },
      booking: {
        id: 2,
        startTime: new Date(),
        endTime: new Date(),
        title: "Test Booking 2",
        uid: "booking-uid-2",
      },
      watchlist: null,
    },
  ];

  const mockReportRepo = {
    findReportsByIds: vi.fn(),
    linkWatchlistToReport: vi.fn(),
  };

  const mockWatchlistRepo = {
    checkExists: vi.fn(),
    createEntry: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PrismaBookingReportRepository).mockImplementation(() => mockReportRepo as any);
    vi.mocked(WatchlistRepository).mockImplementation(() => mockWatchlistRepo as any);
  });

  describe("access control", () => {
    it("should throw NOT_FOUND when report IDs don't exist", async () => {
      mockReportRepo.findReportsByIds.mockResolvedValue([]);

      await expect(
        addToWatchlistHandler({
          ctx: { user: mockUser },
          input: {
            reportIds: ["report-1", "report-2"],
            type: WatchlistType.EMAIL,
          },
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: expect.stringContaining("Booking report(s) not found"),
      });
    });

    it("should throw NOT_FOUND with specific missing IDs", async () => {
      mockReportRepo.findReportsByIds.mockResolvedValue([mockReports[0]]);

      await expect(
        addToWatchlistHandler({
          ctx: { user: mockUser },
          input: {
            reportIds: ["report-1", "report-2", "report-3"],
            type: WatchlistType.EMAIL,
          },
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: expect.stringContaining("report-2, report-3"),
      });
    });

  });

  describe("duplicate prevention", () => {
    it("should throw BAD_REQUEST when all reports are already in watchlist", async () => {
      const reportsInWatchlist = mockReports.map((r) => ({ ...r, watchlistId: "watchlist-123" }));
      mockReportRepo.findReportsByIds.mockResolvedValue(reportsInWatchlist);

      await expect(
        addToWatchlistHandler({
          ctx: { user: mockUser },
          input: {
            reportIds: ["report-1", "report-2"],
            type: WatchlistType.EMAIL,
          },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "All selected bookers are already in the watchlist",
      });
    });
  });

  describe("successful addition", () => {
    it("should create new global watchlist entry for EMAIL type and link report", async () => {
      mockReportRepo.findReportsByIds.mockResolvedValue([mockReports[0]]);
      mockWatchlistRepo.checkExists.mockResolvedValue(null);
      mockWatchlistRepo.createEntry.mockResolvedValue({ id: "watchlist-new" });
      mockReportRepo.linkWatchlistToReport.mockResolvedValue(undefined);

      const result = await addToWatchlistHandler({
        ctx: { user: mockUser },
        input: {
          reportIds: ["report-1"],
          type: WatchlistType.EMAIL,
          description: "Spam user",
        },
      });

      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(1);
      expect(mockWatchlistRepo.checkExists).toHaveBeenCalledWith({
        type: WatchlistType.EMAIL,
        value: "spammer@example.com",
        isGlobal: true,
      });
      expect(mockWatchlistRepo.createEntry).toHaveBeenCalledWith({
        type: WatchlistType.EMAIL,
        value: "spammer@example.com",
        organizationId: null,
        action: WatchlistAction.BLOCK,
        description: "Spam user",
        userId: 1,
        isGlobal: true,
      });
      expect(mockReportRepo.linkWatchlistToReport).toHaveBeenCalledWith({
        reportId: "report-1",
        watchlistId: "watchlist-new",
      });
    });

    it("should create new global watchlist entry for DOMAIN type and link report", async () => {
      mockReportRepo.findReportsByIds.mockResolvedValue([mockReports[0]]);
      mockWatchlistRepo.checkExists.mockResolvedValue(null);
      mockWatchlistRepo.createEntry.mockResolvedValue({ id: "watchlist-domain" });
      mockReportRepo.linkWatchlistToReport.mockResolvedValue(undefined);

      const result = await addToWatchlistHandler({
        ctx: { user: mockUser },
        input: {
          reportIds: ["report-1"],
          type: WatchlistType.DOMAIN,
        },
      });

      expect(result.success).toBe(true);
      expect(mockWatchlistRepo.createEntry).toHaveBeenCalledWith({
        type: WatchlistType.DOMAIN,
        value: "example.com",
        organizationId: null,
        action: WatchlistAction.BLOCK,
        description: undefined,
        userId: 1,
        isGlobal: true,
      });
    });

    it("should reuse existing global watchlist entry when value already exists", async () => {
      mockReportRepo.findReportsByIds.mockResolvedValue([mockReports[0]]);
      mockWatchlistRepo.checkExists.mockResolvedValue({ id: "existing-watchlist" } as any);
      mockReportRepo.linkWatchlistToReport.mockResolvedValue(undefined);

      const result = await addToWatchlistHandler({
        ctx: { user: mockUser },
        input: {
          reportIds: ["report-1"],
          type: WatchlistType.EMAIL,
        },
      });

      expect(result.success).toBe(true);
      expect(mockWatchlistRepo.createEntry).not.toHaveBeenCalled();
      expect(mockReportRepo.linkWatchlistToReport).toHaveBeenCalledWith({
        reportId: "report-1",
        watchlistId: "existing-watchlist",
      });
    });

    it("should process multiple reports in batch", async () => {
      mockReportRepo.findReportsByIds.mockResolvedValue(mockReports);
      mockWatchlistRepo.checkExists.mockResolvedValue(null);
      mockWatchlistRepo.createEntry
        .mockResolvedValueOnce({ id: "watchlist-1" } as any)
        .mockResolvedValueOnce({ id: "watchlist-2" } as any);
      mockReportRepo.linkWatchlistToReport.mockResolvedValue(undefined);

      const result = await addToWatchlistHandler({
        ctx: { user: mockUser },
        input: {
          reportIds: ["report-1", "report-2"],
          type: WatchlistType.EMAIL,
        },
      });

      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(mockWatchlistRepo.createEntry).toHaveBeenCalledTimes(2);
      expect(mockReportRepo.linkWatchlistToReport).toHaveBeenCalledTimes(2);
    });

    it("should return correct counts when processing multiple reports", async () => {
      const mixedReports = [mockReports[0], { ...mockReports[1], watchlistId: "already-added" }];
      mockReportRepo.findReportsByIds.mockResolvedValue(mixedReports);
      mockWatchlistRepo.checkExists.mockResolvedValue(null);
      mockWatchlistRepo.createEntry.mockResolvedValue({ id: "new-watchlist" } as any);
      mockReportRepo.linkWatchlistToReport.mockResolvedValue(undefined);

      const result = await addToWatchlistHandler({
        ctx: { user: mockUser },
        input: {
          reportIds: ["report-1", "report-2"],
          type: WatchlistType.EMAIL,
        },
      });

      expect(result.addedCount).toBe(1);
      expect(result.skippedCount).toBe(1);
      expect(result.message).toBe("Successfully added 1 report(s) to watchlist");
    });
  });

});

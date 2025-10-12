import { describe, it, expect, vi, beforeEach } from "vitest";

import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { WatchlistType, WatchlistAction, ReportReason } from "@calcom/prisma/enums";

import { addToWatchlistHandler } from "./addToWatchlist.handler";

vi.mock("@calcom/lib/server/repository/bookingReport");
vi.mock("@calcom/lib/server/repository/watchlist.repository");

describe("addToWatchlistHandler", () => {
  const mockUser = {
    id: 1,
    email: "admin@example.com",
    organizationId: 100,
  };

  const mockReports = [
    {
      id: "report-1",
      bookingId: 1,
      bookerEmail: "spammer@example.com",
      reportedById: 1,
      reason: ReportReason.SPAM,
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
      reason: ReportReason.SPAM,
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
    it("should throw FORBIDDEN when user is not part of an organization", async () => {
      await expect(
        addToWatchlistHandler({
          ctx: { user: { ...mockUser, organizationId: undefined } },
          input: {
            reportIds: ["report-1"],
            type: WatchlistType.EMAIL,
            action: WatchlistAction.REPORT,
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You must be part of an organization to manage watchlist",
      });
    });

    it("should throw NOT_FOUND when report IDs don't exist or belong to different organization", async () => {
      mockReportRepo.findReportsByIds.mockResolvedValue([]);

      await expect(
        addToWatchlistHandler({
          ctx: { user: mockUser },
          input: {
            reportIds: ["report-1", "report-2"],
            type: WatchlistType.EMAIL,
            action: WatchlistAction.REPORT,
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
            action: WatchlistAction.REPORT,
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
            action: WatchlistAction.REPORT,
          },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "All selected bookers are already in the watchlist",
      });
    });
  });

  describe("successful addition", () => {
    it("should create new watchlist entry for EMAIL type and link report", async () => {
      mockReportRepo.findReportsByIds.mockResolvedValue([mockReports[0]]);
      mockWatchlistRepo.checkExists.mockResolvedValue(null);
      mockWatchlistRepo.createEntry.mockResolvedValue({ id: "watchlist-new" });
      mockReportRepo.linkWatchlistToReport.mockResolvedValue(undefined);

      const result = await addToWatchlistHandler({
        ctx: { user: mockUser },
        input: {
          reportIds: ["report-1"],
          type: WatchlistType.EMAIL,
          action: WatchlistAction.REPORT,
          description: "Spam user",
        },
      });

      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(1);
      expect(mockWatchlistRepo.createEntry).toHaveBeenCalledWith({
        type: WatchlistType.EMAIL,
        value: "spammer@example.com",
        organizationId: 100,
        action: WatchlistAction.REPORT,
        description: "Spam user",
        userId: 1,
      });
      expect(mockReportRepo.linkWatchlistToReport).toHaveBeenCalledWith({
        reportId: "report-1",
        watchlistId: "watchlist-new",
      });
    });

    it("should create new watchlist entry for DOMAIN type and link report", async () => {
      mockReportRepo.findReportsByIds.mockResolvedValue([mockReports[0]]);
      mockWatchlistRepo.checkExists.mockResolvedValue(null);
      mockWatchlistRepo.createEntry.mockResolvedValue({ id: "watchlist-domain" });
      mockReportRepo.linkWatchlistToReport.mockResolvedValue(undefined);

      const result = await addToWatchlistHandler({
        ctx: { user: mockUser },
        input: {
          reportIds: ["report-1"],
          type: WatchlistType.DOMAIN,
          action: WatchlistAction.BLOCK,
        },
      });

      expect(result.success).toBe(true);
      expect(mockWatchlistRepo.createEntry).toHaveBeenCalledWith({
        type: WatchlistType.DOMAIN,
        value: "example.com",
        organizationId: 100,
        action: WatchlistAction.BLOCK,
        description: undefined,
        userId: 1,
      });
    });

    it("should reuse existing watchlist entry when value already exists", async () => {
      mockReportRepo.findReportsByIds.mockResolvedValue([mockReports[0]]);
      mockWatchlistRepo.checkExists.mockResolvedValue({ id: "existing-watchlist" });
      mockReportRepo.linkWatchlistToReport.mockResolvedValue(undefined);

      const result = await addToWatchlistHandler({
        ctx: { user: mockUser },
        input: {
          reportIds: ["report-1"],
          type: WatchlistType.EMAIL,
          action: WatchlistAction.REPORT,
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
        .mockResolvedValueOnce({ id: "watchlist-1" })
        .mockResolvedValueOnce({ id: "watchlist-2" });
      mockReportRepo.linkWatchlistToReport.mockResolvedValue(undefined);

      const result = await addToWatchlistHandler({
        ctx: { user: mockUser },
        input: {
          reportIds: ["report-1", "report-2"],
          type: WatchlistType.EMAIL,
          action: WatchlistAction.BLOCK,
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
      mockWatchlistRepo.createEntry.mockResolvedValue({ id: "new-watchlist" });
      mockReportRepo.linkWatchlistToReport.mockResolvedValue(undefined);

      const result = await addToWatchlistHandler({
        ctx: { user: mockUser },
        input: {
          reportIds: ["report-1", "report-2"],
          type: WatchlistType.EMAIL,
          action: WatchlistAction.REPORT,
        },
      });

      expect(result.addedCount).toBe(1);
      expect(result.skippedCount).toBe(1);
      expect(result.message).toBe("Successfully added 1 report(s) to watchlist");
    });
  });

  describe("error handling", () => {
    it("should handle already exists errors gracefully", async () => {
      mockReportRepo.findReportsByIds.mockResolvedValue([mockReports[0]]);
      mockWatchlistRepo.checkExists.mockResolvedValue(null);
      mockWatchlistRepo.createEntry.mockRejectedValue(
        new Error("Watchlist entry already exists for this value")
      );

      await expect(
        addToWatchlistHandler({
          ctx: { user: mockUser },
          input: {
            reportIds: ["report-1"],
            type: WatchlistType.EMAIL,
            action: WatchlistAction.REPORT,
          },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "This entry already exists in the watchlist for your organization",
      });
    });
  });
});

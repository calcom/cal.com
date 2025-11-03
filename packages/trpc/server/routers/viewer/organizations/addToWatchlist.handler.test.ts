import { describe, it, expect, vi, beforeEach } from "vitest";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import type { WatchlistEntry } from "@calcom/lib/server/repository/watchlist.interface";
import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import {
  MembershipRole,
  WatchlistType,
  WatchlistAction,
  WatchlistSource,
  BookingReportReason,
} from "@calcom/prisma/enums";

import { addToWatchlistHandler } from "./addToWatchlist.handler";

vi.mock("@calcom/features/pbac/services/permission-check.service");
vi.mock("@calcom/lib/server/repository/bookingReport");
vi.mock("@calcom/lib/server/repository/watchlist.repository");

describe("addToWatchlistHandler (Organization)", () => {
  const mockUser = {
    id: 1,
    email: "admin@example.com",
    organizationId: 100,
    profile: null,
  };

  const mockReports = [
    {
      id: "report-1",
      bookingUid: "booking-uid-1",
      bookerEmail: "Spammer@Example.com",
      reportedById: 1,
      reason: BookingReportReason.SPAM,
      description: null,
      cancelled: false,
      createdAt: new Date(),
      watchlistId: null,
      reporter: { id: 1, name: "Admin", email: "admin@example.com" },
      booking: {
        id: 1,
        uid: "booking-uid-1",
        title: "Test Booking",
        startTime: new Date(),
        endTime: new Date(),
      },
      watchlist: null,
    },
    {
      id: "report-2",
      bookingUid: "booking-uid-2",
      bookerEmail: " User@Spammer.com ",
      reportedById: 1,
      reason: BookingReportReason.SPAM,
      description: null,
      cancelled: false,
      createdAt: new Date(),
      watchlistId: null,
      reporter: { id: 1, name: "Admin", email: "admin@example.com" },
      booking: {
        id: 2,
        uid: "booking-uid-2",
        title: "Test Booking 2",
        startTime: new Date(),
        endTime: new Date(),
      },
      watchlist: null,
    },
  ];

  const mockPermissionCheckService = {
    checkPermission: vi.fn(),
  };

  const mockReportRepo = {
    findReportsByIds: vi.fn(),
    linkWatchlistToReport: vi.fn(),
    updateReportStatus: vi.fn(),
  };

  const mockWatchlistRepo = {
    checkExists: vi.fn(),
    createEntry: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PermissionCheckService).mockImplementation(
      () => mockPermissionCheckService as InstanceType<typeof PermissionCheckService>
    );
    vi.mocked(PrismaBookingReportRepository).mockImplementation(
      () => mockReportRepo as InstanceType<typeof PrismaBookingReportRepository>
    );
    vi.mocked(WatchlistRepository).mockImplementation(
      () => mockWatchlistRepo as InstanceType<typeof WatchlistRepository>
    );
  });

  describe("access control", () => {
    it("should throw FORBIDDEN when user is not part of an organization", async () => {
      await expect(
        addToWatchlistHandler({
          ctx: { user: { ...mockUser, organizationId: undefined, profile: null } },
          input: {
            reportIds: ["report-1"],
            type: WatchlistType.EMAIL,
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You must be part of an organization to add to watchlist",
      });

      expect(mockPermissionCheckService.checkPermission).not.toHaveBeenCalled();
    });

    it("should throw UNAUTHORIZED when user lacks permission", async () => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(false);

      await expect(
        addToWatchlistHandler({
          ctx: { user: mockUser },
          input: {
            reportIds: ["report-1"],
            type: WatchlistType.EMAIL,
          },
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "You are not authorized to add entries to the watchlist",
      });

      expect(mockReportRepo.findReportsByIds).not.toHaveBeenCalled();
    });

    it("should check permission with correct parameters", async () => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      mockReportRepo.findReportsByIds.mockResolvedValue([mockReports[0]]);
      mockWatchlistRepo.checkExists.mockResolvedValue(null);
      mockWatchlistRepo.createEntry.mockResolvedValue({ id: "watchlist-new" });
      mockReportRepo.linkWatchlistToReport.mockResolvedValue(undefined);
      mockReportRepo.updateReportStatus.mockResolvedValue(undefined);

      await addToWatchlistHandler({
        ctx: { user: mockUser },
        input: {
          reportIds: ["report-1"],
          type: WatchlistType.EMAIL,
        },
      });

      expect(mockPermissionCheckService.checkPermission).toHaveBeenCalledWith({
        userId: 1,
        teamId: 100,
        permission: "watchlist.create",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });
    });
  });

  describe("validation", () => {
    beforeEach(() => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
    });

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
    beforeEach(() => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
    });

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
    beforeEach(() => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
    });

    it("should create new organization watchlist entry for EMAIL type and link report", async () => {
      mockReportRepo.findReportsByIds.mockResolvedValue([mockReports[0]]);
      mockWatchlistRepo.checkExists.mockResolvedValue(null);
      mockWatchlistRepo.createEntry.mockResolvedValue({ id: "watchlist-new" });
      mockReportRepo.linkWatchlistToReport.mockResolvedValue(undefined);
      mockReportRepo.updateReportStatus.mockResolvedValue(undefined);

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
        organizationId: 100,
      });
      expect(mockWatchlistRepo.createEntry).toHaveBeenCalledWith({
        type: WatchlistType.EMAIL,
        value: "spammer@example.com",
        organizationId: 100,
        action: WatchlistAction.BLOCK,
        description: "Spam user",
        userId: 1,
      });
      expect(mockReportRepo.linkWatchlistToReport).toHaveBeenCalledWith({
        reportId: "report-1",
        watchlistId: "watchlist-new",
      });
      expect(mockReportRepo.updateReportStatus).toHaveBeenCalledWith({
        reportId: "report-1",
        status: "BLOCKED",
        organizationId: 100,
      });
    });

    it("should create new organization watchlist entry for DOMAIN type and link report", async () => {
      mockReportRepo.findReportsByIds.mockResolvedValue([mockReports[0]]);
      mockWatchlistRepo.checkExists.mockResolvedValue(null);
      mockWatchlistRepo.createEntry.mockResolvedValue({ id: "watchlist-domain" });
      mockReportRepo.linkWatchlistToReport.mockResolvedValue(undefined);
      mockReportRepo.updateReportStatus.mockResolvedValue(undefined);

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
        organizationId: 100,
        action: WatchlistAction.BLOCK,
        description: undefined,
        userId: 1,
      });
      expect(mockReportRepo.updateReportStatus).toHaveBeenCalledWith({
        reportId: "report-1",
        status: "BLOCKED",
        organizationId: 100,
      });
    });

    it("should reuse existing organization watchlist entry when value already exists", async () => {
      mockReportRepo.findReportsByIds.mockResolvedValue([mockReports[0]]);
      mockWatchlistRepo.checkExists.mockResolvedValue({ id: "existing-watchlist" } as WatchlistEntry);
      mockReportRepo.linkWatchlistToReport.mockResolvedValue(undefined);
      mockReportRepo.updateReportStatus.mockResolvedValue(undefined);

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
      expect(mockReportRepo.updateReportStatus).toHaveBeenCalledWith({
        reportId: "report-1",
        status: "BLOCKED",
        organizationId: 100,
      });
    });
  });

  describe("organization scoping", () => {
    beforeEach(() => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
    });

    it("should pass organizationId to repository when finding reports", async () => {
      mockReportRepo.findReportsByIds.mockResolvedValue([mockReports[0]]);
      mockWatchlistRepo.checkExists.mockResolvedValue(null);
      mockWatchlistRepo.createEntry.mockResolvedValue({ id: "watchlist-new" });
      mockReportRepo.linkWatchlistToReport.mockResolvedValue(undefined);
      mockReportRepo.updateReportStatus.mockResolvedValue(undefined);

      await addToWatchlistHandler({
        ctx: { user: mockUser },
        input: {
          reportIds: ["report-1"],
          type: WatchlistType.EMAIL,
        },
      });

      expect(mockReportRepo.findReportsByIds).toHaveBeenCalledWith({
        reportIds: ["report-1"],
        organizationId: 100,
      });
    });

    it("should pass organizationId when checking for existing watchlist entry", async () => {
      mockReportRepo.findReportsByIds.mockResolvedValue([mockReports[0]]);
      mockWatchlistRepo.checkExists.mockResolvedValue(null);
      mockWatchlistRepo.createEntry.mockResolvedValue({ id: "watchlist-new" });
      mockReportRepo.linkWatchlistToReport.mockResolvedValue(undefined);
      mockReportRepo.updateReportStatus.mockResolvedValue(undefined);

      await addToWatchlistHandler({
        ctx: { user: mockUser },
        input: {
          reportIds: ["report-1"],
          type: WatchlistType.EMAIL,
        },
      });

      expect(mockWatchlistRepo.checkExists).toHaveBeenCalledWith({
        type: WatchlistType.EMAIL,
        value: "spammer@example.com",
        organizationId: 100,
      });
    });
  });
});

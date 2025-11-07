import { describe, it, expect, vi, beforeEach } from "vitest";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import { MembershipRole, BookingReportReason } from "@calcom/prisma/enums";

import { dismissBookingReportHandler } from "./dismissBookingReport.handler";

vi.mock("@calcom/features/pbac/services/permission-check.service");
vi.mock("@calcom/lib/server/repository/bookingReport");

describe("dismissBookingReportHandler", () => {
  const mockUser = {
    id: 1,
    email: "admin@example.com",
    organizationId: 100,
    profile: null,
  };

  const mockReport = {
    id: "report-1",
    bookingUid: "booking-uid-1",
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
      uid: "booking-uid-1",
      title: "Test Booking",
      startTime: new Date(),
      endTime: new Date(),
    },
    watchlist: null,
  };

  const mockPermissionCheckService = {
    checkPermission: vi.fn(),
  };

  const mockReportRepo = {
    findReportsByIds: vi.fn(),
    updateReportStatus: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PermissionCheckService).mockImplementation(
      () => mockPermissionCheckService as InstanceType<typeof PermissionCheckService>
    );
    vi.mocked(PrismaBookingReportRepository).mockImplementation(
      () => mockReportRepo as InstanceType<typeof PrismaBookingReportRepository>
    );
  });

  describe("access control", () => {
    it("should throw FORBIDDEN when user is not part of an organization", async () => {
      const userWithoutOrg = { ...mockUser, organizationId: null, profile: null };

      await expect(
        dismissBookingReportHandler({
          ctx: { user: userWithoutOrg },
          input: { reportId: "report-1" },
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: "FORBIDDEN",
          message: "You must be part of an organization to dismiss booking reports",
        })
      );
    });

    it("should throw UNAUTHORIZED when user lacks permission", async () => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(false);

      await expect(
        dismissBookingReportHandler({
          ctx: { user: mockUser },
          input: { reportId: "report-1" },
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: "UNAUTHORIZED",
          message: "You are not authorized to dismiss booking reports",
        })
      );
    });

    it("should check for watchlist.update permission", async () => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      mockReportRepo.findReportsByIds.mockResolvedValue([mockReport]);
      mockReportRepo.updateReportStatus.mockResolvedValue(undefined);

      await dismissBookingReportHandler({
        ctx: { user: mockUser },
        input: { reportId: "report-1" },
      });

      expect(mockPermissionCheckService.checkPermission).toHaveBeenCalledWith({
        userId: 1,
        teamId: 100,
        permission: "watchlist.update",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });
    });
  });

  describe("report verification", () => {
    beforeEach(() => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
    });

    it("should throw NOT_FOUND when report does not exist", async () => {
      mockReportRepo.findReportsByIds.mockResolvedValue([]);

      await expect(
        dismissBookingReportHandler({
          ctx: { user: mockUser },
          input: { reportId: "non-existent-report" },
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: "NOT_FOUND",
          message: "Booking report not found",
        })
      );

      expect(mockReportRepo.findReportsByIds).toHaveBeenCalledWith({
        reportIds: ["non-existent-report"],
        organizationId: 100,
      });
    });

    it("should throw BAD_REQUEST when report already has a watchlist entry", async () => {
      const blockedReport = { ...mockReport, watchlistId: "watchlist-123" };
      mockReportRepo.findReportsByIds.mockResolvedValue([blockedReport]);

      await expect(
        dismissBookingReportHandler({
          ctx: { user: mockUser },
          input: { reportId: "report-1" },
        })
      ).rejects.toThrow(
        expect.objectContaining({
          code: "BAD_REQUEST",
          message: "Cannot dismiss a report that has already been added to the blocklist",
        })
      );

      expect(mockReportRepo.updateReportStatus).not.toHaveBeenCalled();
    });
  });

  describe("successful dismissal", () => {
    beforeEach(() => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      mockReportRepo.findReportsByIds.mockResolvedValue([mockReport]);
      mockReportRepo.updateReportStatus.mockResolvedValue(undefined);
    });

    it("should successfully dismiss a booking report after verifying it belongs to organization", async () => {
      const result = await dismissBookingReportHandler({
        ctx: { user: mockUser },
        input: { reportId: "report-1" },
      });

      expect(result).toEqual({ success: true });
      expect(mockReportRepo.findReportsByIds).toHaveBeenCalledWith({
        reportIds: ["report-1"],
        organizationId: 100,
      });
      expect(mockReportRepo.updateReportStatus).toHaveBeenCalledWith({
        reportId: "report-1",
        status: "DISMISSED",
        organizationId: 100,
      });
    });
  });
});

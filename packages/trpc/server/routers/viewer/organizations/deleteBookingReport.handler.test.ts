import { describe, it, expect, vi, beforeEach } from "vitest";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import { MembershipRole } from "@calcom/prisma/enums";

import { deleteBookingReportHandler } from "./deleteBookingReport.handler";

vi.mock("@calcom/features/pbac/services/permission-check.service");
vi.mock("@calcom/lib/server/repository/bookingReport");

describe("deleteBookingReportHandler (Organization)", () => {
  const mockUser = {
    id: 1,
    email: "admin@example.com",
    organizationId: 100,
    profile: null,
  };

  const mockPermissionCheckService = {
    checkPermission: vi.fn(),
  };

  const mockReportRepo = {
    deleteReport: vi.fn(),
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
      await expect(
        deleteBookingReportHandler({
          ctx: { user: { ...mockUser, organizationId: undefined, profile: null } },
          input: {
            reportId: "report-123",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You must be part of an organization to delete booking reports",
      });

      expect(mockPermissionCheckService.checkPermission).not.toHaveBeenCalled();
    });

    it("should throw UNAUTHORIZED when user lacks permission", async () => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(false);

      await expect(
        deleteBookingReportHandler({
          ctx: { user: mockUser },
          input: {
            reportId: "report-123",
          },
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "You are not authorized to delete booking reports",
      });

      expect(mockReportRepo.deleteReport).not.toHaveBeenCalled();
    });

    it("should check permission with correct parameters", async () => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      mockReportRepo.deleteReport.mockResolvedValue(undefined);

      await deleteBookingReportHandler({
        ctx: { user: mockUser },
        input: {
          reportId: "report-123",
        },
      });

      expect(mockPermissionCheckService.checkPermission).toHaveBeenCalledWith({
        userId: 1,
        teamId: 100,
        permission: "watchlist.delete",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });
    });
  });

  describe("successful deletion", () => {
    beforeEach(() => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
    });

    it("should successfully delete report with organizationId scoping", async () => {
      mockReportRepo.deleteReport.mockResolvedValue(undefined);

      const result = await deleteBookingReportHandler({
        ctx: { user: mockUser },
        input: {
          reportId: "report-123",
        },
      });

      expect(result.success).toBe(true);
      expect(mockReportRepo.deleteReport).toHaveBeenCalledWith({
        reportId: "report-123",
        organizationId: 100,
      });
    });

    it("should call repository deleteReport with correct parameters", async () => {
      mockReportRepo.deleteReport.mockResolvedValue(undefined);

      await deleteBookingReportHandler({
        ctx: { user: mockUser },
        input: {
          reportId: "different-report-456",
        },
      });

      expect(mockReportRepo.deleteReport).toHaveBeenCalledWith({
        reportId: "different-report-456",
        organizationId: 100,
      });
      expect(mockReportRepo.deleteReport).toHaveBeenCalledTimes(1);
    });
  });

  describe("organization scoping", () => {
    beforeEach(() => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
    });

    it("should only delete reports within user's organization", async () => {
      mockReportRepo.deleteReport.mockResolvedValue(undefined);

      await deleteBookingReportHandler({
        ctx: { user: mockUser },
        input: {
          reportId: "report-from-org-100",
        },
      });

      expect(mockReportRepo.deleteReport).toHaveBeenCalledWith({
        reportId: "report-from-org-100",
        organizationId: 100,
      });
    });
  });
});

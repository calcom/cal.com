import { describe, it, expect, vi, beforeEach } from "vitest";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { MembershipRole, WatchlistType, WatchlistAction } from "@calcom/prisma/enums";

import { deleteWatchlistEntryHandler } from "./deleteWatchlistEntry.handler";

vi.mock("@calcom/features/pbac/services/permission-check.service");
vi.mock("@calcom/lib/server/repository/watchlist.repository");

describe("deleteWatchlistEntryHandler", () => {
  const mockUser = {
    id: 1,
    email: "admin@example.com",
    organizationId: 100,
    profile: null,
  };

  const mockEntry = {
    id: "entry-123",
    type: WatchlistType.EMAIL,
    value: "spam@example.com",
    organizationId: 100,
    action: WatchlistAction.BLOCK,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPermissionCheckService = {
    checkPermission: vi.fn(),
  };

  const mockWatchlistRepo = {
    findEntryWithAuditAndReports: vi.fn(),
    deleteEntry: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PermissionCheckService).mockImplementation(() => mockPermissionCheckService as any);
    vi.mocked(WatchlistRepository).mockImplementation(() => mockWatchlistRepo as any);
  });

  describe("access control", () => {
    it("should throw FORBIDDEN when user is not part of an organization", async () => {
      await expect(
        deleteWatchlistEntryHandler({
          ctx: { user: { ...mockUser, organizationId: undefined, profile: null } },
          input: {
            id: "entry-123",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You must be part of an organization to manage blocklist",
      });

      expect(mockPermissionCheckService.checkPermission).not.toHaveBeenCalled();
    });

    it("should throw UNAUTHORIZED when user lacks permission", async () => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(false);

      await expect(
        deleteWatchlistEntryHandler({
          ctx: { user: mockUser },
          input: {
            id: "entry-123",
          },
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "You are not authorized to delete blocklist entries",
      });

      expect(mockWatchlistRepo.findEntryWithAuditAndReports).not.toHaveBeenCalled();
    });

    it("should check permission with correct parameters", async () => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: mockEntry,
        auditHistory: [],
      });
      mockWatchlistRepo.deleteEntry.mockResolvedValue(undefined);

      await deleteWatchlistEntryHandler({
        ctx: { user: mockUser },
        input: {
          id: "entry-123",
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

  describe("validation", () => {
    beforeEach(() => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
    });

    it("should throw NOT_FOUND when entry does not exist", async () => {
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: null,
        auditHistory: [],
      });

      await expect(
        deleteWatchlistEntryHandler({
          ctx: { user: mockUser },
          input: {
            id: "non-existent-id",
          },
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Blocklist entry not found",
      });

      expect(mockWatchlistRepo.deleteEntry).not.toHaveBeenCalled();
    });

    it("should throw FORBIDDEN when entry belongs to different organization", async () => {
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: { ...mockEntry, organizationId: 999 },
        auditHistory: [],
      });

      await expect(
        deleteWatchlistEntryHandler({
          ctx: { user: mockUser },
          input: {
            id: "entry-123",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You can only delete blocklist entries from your organization",
      });

      expect(mockWatchlistRepo.deleteEntry).not.toHaveBeenCalled();
    });
  });

  describe("successful deletion", () => {
    beforeEach(() => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
    });

    it("should successfully delete entry when authorized", async () => {
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: mockEntry,
        auditHistory: [],
      });
      mockWatchlistRepo.deleteEntry.mockResolvedValue(undefined);

      const result = await deleteWatchlistEntryHandler({
        ctx: { user: mockUser },
        input: {
          id: "entry-123",
        },
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Blocklist entry deleted successfully");
      expect(mockWatchlistRepo.deleteEntry).toHaveBeenCalledWith("entry-123", 1);
    });

    it("should pass correct userId to deleteEntry", async () => {
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: mockEntry,
        auditHistory: [],
      });
      mockWatchlistRepo.deleteEntry.mockResolvedValue(undefined);

      await deleteWatchlistEntryHandler({
        ctx: { user: { ...mockUser, id: 42 } },
        input: {
          id: "entry-123",
        },
      });

      expect(mockWatchlistRepo.deleteEntry).toHaveBeenCalledWith("entry-123", 42);
    });
  });
});

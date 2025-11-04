import { describe, it, expect, vi, beforeEach } from "vitest";

import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { MembershipRole, WatchlistType, WatchlistAction } from "@calcom/prisma/enums";

import { getWatchlistEntryDetailsHandler } from "./getWatchlistEntryDetails.handler";

vi.mock("@calcom/features/pbac/services/permission-check.service");
vi.mock("@calcom/features/users/repositories/UserRepository");
vi.mock("@calcom/lib/server/repository/watchlist.repository");

describe("getWatchlistEntryDetailsHandler", () => {
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
    description: "Known spammer",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-02"),
  };

  const mockAuditHistory = [
    {
      id: "audit-1",
      watchlistId: "entry-123",
      action: "CREATED" as const,
      changedByUserId: 1,
      timestamp: new Date("2025-01-01"),
      previousValue: null,
      newValue: "spam@example.com",
    },
    {
      id: "audit-2",
      watchlistId: "entry-123",
      action: "UPDATED" as const,
      changedByUserId: 2,
      timestamp: new Date("2025-01-02"),
      previousValue: null,
      newValue: "Known spammer",
    },
  ];

  const mockUsers = [
    { id: 1, name: "Admin", email: "admin@example.com" },
    { id: 2, name: "Editor", email: "editor@example.com" },
  ];

  const mockPermissionCheckService = {
    checkPermission: vi.fn(),
  };

  const mockWatchlistRepo = {
    findEntryWithAuditAndReports: vi.fn(),
  };

  const mockUserRepo = {
    findUsersByIds: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PermissionCheckService).mockImplementation(() => mockPermissionCheckService as any);
    vi.mocked(WatchlistRepository).mockImplementation(() => mockWatchlistRepo as any);
    vi.mocked(UserRepository).mockImplementation(() => mockUserRepo as any);
  });

  describe("access control", () => {
    it("should throw FORBIDDEN when user is not part of an organization", async () => {
      await expect(
        getWatchlistEntryDetailsHandler({
          ctx: { user: { ...mockUser, organizationId: undefined, profile: null } },
          input: {
            id: "entry-123",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You must be part of an organization to view blocklist",
      });

      expect(mockPermissionCheckService.checkPermission).not.toHaveBeenCalled();
    });

    it("should use profile.organizationId when available", async () => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: { ...mockEntry, organizationId: 200 },
        auditHistory: [],
      });

      await getWatchlistEntryDetailsHandler({
        ctx: {
          user: {
            ...mockUser,
            organizationId: undefined,
            profile: { organizationId: 200 },
          },
        },
        input: {
          id: "entry-123",
        },
      });

      expect(mockPermissionCheckService.checkPermission).toHaveBeenCalledWith({
        userId: 1,
        teamId: 200,
        permission: "watchlist.read",
        fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
      });
    });

    it("should throw UNAUTHORIZED when user lacks permission", async () => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(false);

      await expect(
        getWatchlistEntryDetailsHandler({
          ctx: { user: mockUser },
          input: {
            id: "entry-123",
          },
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "You are not authorized to view blocklist entries",
      });

      expect(mockWatchlistRepo.findEntryWithAuditAndReports).not.toHaveBeenCalled();
    });

    it("should check permission with correct parameters", async () => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: mockEntry,
        auditHistory: [],
      });

      await getWatchlistEntryDetailsHandler({
        ctx: { user: mockUser },
        input: {
          id: "entry-123",
        },
      });

      expect(mockPermissionCheckService.checkPermission).toHaveBeenCalledWith({
        userId: 1,
        teamId: 100,
        permission: "watchlist.read",
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
        getWatchlistEntryDetailsHandler({
          ctx: { user: mockUser },
          input: {
            id: "non-existent-id",
          },
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Blocklist entry not found",
      });
    });

    it("should throw FORBIDDEN when entry belongs to different organization", async () => {
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: { ...mockEntry, organizationId: 999 },
        auditHistory: [],
      });

      await expect(
        getWatchlistEntryDetailsHandler({
          ctx: { user: mockUser },
          input: {
            id: "entry-123",
          },
        })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "You can only view blocklist entries from your organization",
      });
    });
  });

  describe("successful retrieval", () => {
    beforeEach(() => {
      mockPermissionCheckService.checkPermission.mockResolvedValue(true);
    });

    it("should return entry and audit history when authorized", async () => {
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: mockEntry,
        auditHistory: mockAuditHistory,
      });
      mockUserRepo.findUsersByIds.mockResolvedValue(mockUsers);

      const result = await getWatchlistEntryDetailsHandler({
        ctx: { user: mockUser },
        input: {
          id: "entry-123",
        },
      });

      expect(result.entry).toEqual(mockEntry);
      expect(result.auditHistory).toHaveLength(2);
      expect(mockWatchlistRepo.findEntryWithAuditAndReports).toHaveBeenCalledWith("entry-123");
    });

    it("should enrich audit history with user details", async () => {
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: mockEntry,
        auditHistory: mockAuditHistory,
      });
      mockUserRepo.findUsersByIds.mockResolvedValue(mockUsers);

      const result = await getWatchlistEntryDetailsHandler({
        ctx: { user: mockUser },
        input: {
          id: "entry-123",
        },
      });

      expect(result.auditHistory[0].changedByUser).toEqual(mockUsers[0]);
      expect(result.auditHistory[1].changedByUser).toEqual(mockUsers[1]);
      expect(mockUserRepo.findUsersByIds).toHaveBeenCalledWith([1, 2]);
    });

    it("should handle audit history with duplicate user IDs", async () => {
      const auditWithDuplicates = [
        { ...mockAuditHistory[0], changedByUserId: 1 },
        { ...mockAuditHistory[1], changedByUserId: 1 },
      ];

      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: mockEntry,
        auditHistory: auditWithDuplicates,
      });
      mockUserRepo.findUsersByIds.mockResolvedValue([mockUsers[0]]);

      const result = await getWatchlistEntryDetailsHandler({
        ctx: { user: mockUser },
        input: {
          id: "entry-123",
        },
      });

      expect(mockUserRepo.findUsersByIds).toHaveBeenCalledWith([1]);
      expect(result.auditHistory[0].changedByUser).toEqual(mockUsers[0]);
      expect(result.auditHistory[1].changedByUser).toEqual(mockUsers[0]);
    });

    it("should handle audit history with null user IDs", async () => {
      const auditWithNulls = [
        { ...mockAuditHistory[0], changedByUserId: null },
        { ...mockAuditHistory[1], changedByUserId: 2 },
      ];

      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: mockEntry,
        auditHistory: auditWithNulls,
      });
      mockUserRepo.findUsersByIds.mockResolvedValue([mockUsers[1]]);

      const result = await getWatchlistEntryDetailsHandler({
        ctx: { user: mockUser },
        input: {
          id: "entry-123",
        },
      });

      expect(mockUserRepo.findUsersByIds).toHaveBeenCalledWith([2]);
      expect(result.auditHistory[0].changedByUser).toBeUndefined();
      expect(result.auditHistory[1].changedByUser).toEqual(mockUsers[1]);
    });

    it("should handle audit history with undefined user IDs", async () => {
      const auditWithUndefined = [
        { ...mockAuditHistory[0], changedByUserId: undefined },
        { ...mockAuditHistory[1], changedByUserId: 2 },
      ];

      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: mockEntry,
        auditHistory: auditWithUndefined,
      });
      mockUserRepo.findUsersByIds.mockResolvedValue([mockUsers[1]]);

      const result = await getWatchlistEntryDetailsHandler({
        ctx: { user: mockUser },
        input: {
          id: "entry-123",
        },
      });

      expect(mockUserRepo.findUsersByIds).toHaveBeenCalledWith([2]);
      expect(result.auditHistory[0].changedByUser).toBeUndefined();
      expect(result.auditHistory[1].changedByUser).toEqual(mockUsers[1]);
    });

    it("should not call findUsersByIds when audit history is empty", async () => {
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: mockEntry,
        auditHistory: [],
      });

      const result = await getWatchlistEntryDetailsHandler({
        ctx: { user: mockUser },
        input: {
          id: "entry-123",
        },
      });

      expect(result.auditHistory).toHaveLength(0);
      expect(mockUserRepo.findUsersByIds).not.toHaveBeenCalled();
    });

    it("should handle when user is not found in user map", async () => {
      mockWatchlistRepo.findEntryWithAuditAndReports.mockResolvedValue({
        entry: mockEntry,
        auditHistory: [mockAuditHistory[0]],
      });
      mockUserRepo.findUsersByIds.mockResolvedValue([]);

      const result = await getWatchlistEntryDetailsHandler({
        ctx: { user: mockUser },
        input: {
          id: "entry-123",
        },
      });

      expect(result.auditHistory[0].changedByUser).toBeUndefined();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventTypePermissionService } from "../permissions/EventTypePermissionService";
import { TRPCError } from "@trpc/server";
import { MembershipRole } from "@calcom/prisma/enums";

// Mock dependencies
vi.mock("@calcom/features/pbac/lib/resource-permissions", () => ({
  getResourcePermissions: vi.fn(),
}));

import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";

const mockGetResourcePermissions = vi.mocked(getResourcePermissions);

describe("EventTypePermissionService", () => {
  let service: EventTypePermissionService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      membership: {
        findFirst: vi.fn(),
      },
      organizationSettings: {
        findUnique: vi.fn(),
      },
    };

    service = new EventTypePermissionService(mockPrisma);
  });

  describe("checkOrganizationPermission", () => {
    it("should return true when user has organization create permission", async () => {
      mockGetResourcePermissions.mockResolvedValue({ canCreate: true } as any);

      const result = await service.checkOrganizationPermission({
        userId: 1,
        organizationId: 100,
        isOrgAdmin: false,
      });

      expect(result).toBe(true);
      expect(mockGetResourcePermissions).toHaveBeenCalledWith({
        userId: 1,
        teamId: 100,
        resource: expect.anything(),
        userRole: MembershipRole.MEMBER,
        fallbackRoles: {
          create: {
            roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
          },
        },
      });
    });

    it("should fallback to isOrgAdmin when PBAC check fails", async () => {
      mockGetResourcePermissions.mockRejectedValue(new Error("PBAC error"));

      const result = await service.checkOrganizationPermission({
        userId: 1,
        organizationId: 100,
        isOrgAdmin: true,
      });

      expect(result).toBe(true);
    });
  });

  describe("checkTeamPermission", () => {
    it("should return hasPermission true for team admin", async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({
        userId: 1,
        teamId: 50,
        role: MembershipRole.ADMIN,
        accepted: true,
      });

      mockGetResourcePermissions.mockResolvedValue({ canCreate: true } as any);

      const result = await service.checkTeamPermission({
        userId: 1,
        teamId: 50,
      });

      expect(result).toEqual({
        hasPermission: true,
        hasMembership: true,
      });
    });

    it("should return false when user has no membership", async () => {
      mockPrisma.membership.findFirst.mockResolvedValue(null);

      const result = await service.checkTeamPermission({
        userId: 1,
        teamId: 50,
      });

      expect(result).toEqual({
        hasPermission: false,
        hasMembership: false,
      });
    });

    it("should fallback to role check when PBAC fails", async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({
        userId: 1,
        teamId: 50,
        role: MembershipRole.OWNER,
        accepted: true,
      });

      mockGetResourcePermissions.mockRejectedValue(new Error("PBAC error"));

      const result = await service.checkTeamPermission({
        userId: 1,
        teamId: 50,
      });

      expect(result).toEqual({
        hasPermission: true,
        hasMembership: true,
      });
    });
  });

  describe("checkOrganizationEventTypeLock", () => {
    it("should return true when event type creation is locked", async () => {
      mockPrisma.organizationSettings.findUnique.mockResolvedValue({
        lockEventTypeCreationForUsers: true,
      });

      const result = await service.checkOrganizationEventTypeLock(100);

      expect(result).toBe(true);
    });

    it("should return false when event type creation is not locked", async () => {
      mockPrisma.organizationSettings.findUnique.mockResolvedValue({
        lockEventTypeCreationForUsers: false,
      });

      const result = await service.checkOrganizationEventTypeLock(100);

      expect(result).toBe(false);
    });

    it("should return false when no organization settings exist", async () => {
      mockPrisma.organizationSettings.findUnique.mockResolvedValue(null);

      const result = await service.checkOrganizationEventTypeLock(100);

      expect(result).toBe(false);
    });
  });

  describe("validateCreatePermissions", () => {
    it("should pass for system admin", async () => {
      await expect(
        service.validateCreatePermissions({
          userId: 1,
          teamId: 50,
          organizationId: 100,
          isOrgAdmin: false,
          isSystemAdmin: true,
        })
      ).resolves.not.toThrow();
    });

    it("should throw UNAUTHORIZED for team creation without permission", async () => {
      mockPrisma.membership.findFirst.mockResolvedValue({
        userId: 1,
        teamId: 50,
        role: MembershipRole.MEMBER,
        accepted: true,
      });

      mockGetResourcePermissions.mockResolvedValue({ canCreate: false } as any);

      await expect(
        service.validateCreatePermissions({
          userId: 1,
          teamId: 50,
          organizationId: 100,
          isOrgAdmin: false,
          isSystemAdmin: false,
        })
      ).rejects.toThrow(TRPCError);
    });

    it("should throw UNAUTHORIZED for personal event type when locked", async () => {
      mockGetResourcePermissions.mockResolvedValue({ canCreate: false } as any);
      mockPrisma.organizationSettings.findUnique.mockResolvedValue({
        lockEventTypeCreationForUsers: true,
      });

      await expect(
        service.validateCreatePermissions({
          userId: 1,
          organizationId: 100,
          isOrgAdmin: false,
          isSystemAdmin: false,
        })
      ).rejects.toThrow(TRPCError);
    });

    it("should pass for org admin creating team event", async () => {
      mockGetResourcePermissions.mockResolvedValue({ canCreate: true } as any);

      await expect(
        service.validateCreatePermissions({
          userId: 1,
          teamId: 50,
          organizationId: 100,
          isOrgAdmin: true,
          isSystemAdmin: false,
        })
      ).resolves.not.toThrow();
    });
  });
});
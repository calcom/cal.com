import { prisma } from "@calcom/prisma/__mocks__/prisma";

import { vi, type Mock, describe, it, expect, beforeEach } from "vitest";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { MembershipRole } from "@calcom/prisma/enums";

import { Resource } from "../../domain/types/permission-registry";
import { PermissionCheckService } from "../../services/permission-check.service";
import { getEventTypePermissions } from "../event-type-permissions";

vi.mock("@calcom/features/flags/features.repository");
vi.mock("../../services/permission-check.service");

vi.mock("@calcom/prisma", () => ({
  prisma,
}));

describe("getEventTypePermissions", () => {
  let mockFeaturesRepository: {
    checkIfTeamHasFeature: Mock;
  };
  let mockPermissionCheckService: {
    getResourcePermissions: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockFeaturesRepository = {
      checkIfTeamHasFeature: vi.fn(),
    };

    mockPermissionCheckService = {
      getResourcePermissions: vi.fn(),
    };

    vi.mocked(FeaturesRepository).mockImplementation(() => mockFeaturesRepository as any);
    vi.mocked(PermissionCheckService).mockImplementation(() => mockPermissionCheckService as any);

    prisma.membership.findFirst = vi.fn();
    prisma.team.findUnique = vi.fn();
  });

  describe("personal event types", () => {
    it("should return full permissions for personal events (teamId is null)", async () => {
      const result = await getEventTypePermissions(1, null);

      expect(result).toEqual({
        eventTypes: {
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
        },
        workflows: {
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
        },
      });

      expect(mockFeaturesRepository.checkIfTeamHasFeature).not.toHaveBeenCalled();
      expect(mockPermissionCheckService.getResourcePermissions).not.toHaveBeenCalled();
      expect(prisma.membership.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("team event types with PBAC enabled", () => {
    beforeEach(() => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValue(true);
    });

    it("should use PBAC permissions when enabled", async () => {
      mockPermissionCheckService.getResourcePermissions
        .mockResolvedValueOnce(["eventType.read", "eventType.create", "eventType.update"])
        .mockResolvedValueOnce(["workflow.read", "workflow.update"]);

      const result = await getEventTypePermissions(1, 2);

      expect(mockFeaturesRepository.checkIfTeamHasFeature).toHaveBeenCalledWith(2, "pbac");
      expect(mockPermissionCheckService.getResourcePermissions).toHaveBeenCalledTimes(2);
      expect(mockPermissionCheckService.getResourcePermissions).toHaveBeenNthCalledWith(1, {
        userId: 1,
        teamId: 2,
        resource: Resource.EventType,
      });
      expect(mockPermissionCheckService.getResourcePermissions).toHaveBeenNthCalledWith(2, {
        userId: 1,
        teamId: 2,
        resource: Resource.Workflow,
      });

      expect(result).toEqual({
        eventTypes: {
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: false,
        },
        workflows: {
          canRead: true,
          canCreate: false,
          canUpdate: true,
          canDelete: false,
        },
      });

      expect(prisma.membership.findFirst).not.toHaveBeenCalled();
    });

    it("should map canEdit to canUpdate correctly", async () => {
      mockPermissionCheckService.getResourcePermissions
        .mockResolvedValueOnce(["eventType.read", "eventType.update"])
        .mockResolvedValueOnce([]);

      const result = await getEventTypePermissions(1, 2);

      expect(result.eventTypes.canUpdate).toBe(true);
      expect(result.workflows.canUpdate).toBe(false);
    });

    it("should handle all permissions denied", async () => {
      mockPermissionCheckService.getResourcePermissions.mockResolvedValue([]);

      const result = await getEventTypePermissions(1, 2);

      expect(result).toEqual({
        eventTypes: {
          canRead: false,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
        },
        workflows: {
          canRead: false,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
        },
      });
    });

    it("should handle all permissions granted", async () => {
      mockPermissionCheckService.getResourcePermissions.mockResolvedValue([
        "eventType.read",
        "eventType.create",
        "eventType.update",
        "eventType.delete",
        "workflow.read",
        "workflow.create",
        "workflow.update",
        "workflow.delete",
      ]);

      const result = await getEventTypePermissions(1, 2);

      expect(result).toEqual({
        eventTypes: {
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
        },
        workflows: {
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
        },
      });
    });
  });

  describe("team event types with PBAC disabled (role-based fallback)", () => {
    beforeEach(() => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValue(false);
    });

    describe("team without parent org", () => {
      beforeEach(() => {
        (prisma.team.findUnique as Mock).mockResolvedValue({
          parentId: null,
        });
      });

      it("should grant full permissions to OWNER role", async () => {
        (prisma.membership.findFirst as Mock).mockResolvedValueOnce({
          role: MembershipRole.OWNER,
        });

        const result = await getEventTypePermissions(1, 2);

        expect(mockFeaturesRepository.checkIfTeamHasFeature).toHaveBeenCalledWith(2, "pbac");
        expect(prisma.team.findUnique).toHaveBeenCalledWith({
          where: {
            id: 2,
          },
          select: {
            parentId: true,
          },
        });

        expect(result).toEqual({
          eventTypes: {
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
          workflows: {
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
        });
      });

      it("should grant full permissions to ADMIN role", async () => {
        (prisma.membership.findFirst as Mock).mockResolvedValueOnce({
          role: MembershipRole.ADMIN,
        });

        const result = await getEventTypePermissions(1, 2);

        expect(result).toEqual({
          eventTypes: {
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
          workflows: {
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
        });
      });

      it("should grant read-only permissions to MEMBER role", async () => {
        (prisma.membership.findFirst as Mock).mockResolvedValueOnce({
          role: MembershipRole.MEMBER,
        });

        const result = await getEventTypePermissions(1, 2);

        expect(result).toEqual({
          eventTypes: {
            canRead: true,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
          },
          workflows: {
            canRead: true,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
          },
        });
      });

      it("should throw error when membership not found", async () => {
        (prisma.membership.findFirst as Mock).mockResolvedValueOnce(null);

        await expect(getEventTypePermissions(1, 2)).rejects.toThrow("Membership not found");
      });
    });

    describe("team with parent org - org role takes precedence", () => {
      beforeEach(() => {
        (prisma.team.findUnique as Mock).mockResolvedValue({
          parentId: 100,
        });
      });

      it("should use org ADMIN role when user is not a team member", async () => {
        (prisma.membership.findFirst as Mock)
          .mockResolvedValueOnce(null) // No team membership
          .mockResolvedValueOnce({
            // Org membership
            role: MembershipRole.ADMIN,
          });

        const result = await getEventTypePermissions(1, 2);

        expect(prisma.membership.findFirst).toHaveBeenCalledTimes(2);
        expect(prisma.membership.findFirst).toHaveBeenNthCalledWith(1, {
          where: { userId: 1, teamId: 2 },
          select: { role: true },
        });
        expect(prisma.membership.findFirst).toHaveBeenNthCalledWith(2, {
          where: { userId: 1, teamId: 100 },
          select: { role: true },
        });

        expect(result).toEqual({
          eventTypes: {
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
          workflows: {
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
        });
      });

      it("should use org ADMIN role when team role is MEMBER", async () => {
        (prisma.membership.findFirst as Mock)
          .mockResolvedValueOnce({
            role: MembershipRole.MEMBER,
          })
          .mockResolvedValueOnce({
            role: MembershipRole.ADMIN,
          });

        const result = await getEventTypePermissions(1, 2);

        expect(result).toEqual({
          eventTypes: {
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
          workflows: {
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
        });
      });

      it("should use org OWNER role when team role is ADMIN", async () => {
        (prisma.membership.findFirst as Mock)
          .mockResolvedValueOnce({
            role: MembershipRole.ADMIN,
          })
          .mockResolvedValueOnce({
            role: MembershipRole.OWNER,
          });

        const result = await getEventTypePermissions(1, 2);

        expect(result).toEqual({
          eventTypes: {
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
          workflows: {
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
        });
      });

      it("should use team ADMIN role when org role is MEMBER", async () => {
        (prisma.membership.findFirst as Mock)
          .mockResolvedValueOnce({
            role: MembershipRole.ADMIN,
          })
          .mockResolvedValueOnce({
            role: MembershipRole.MEMBER,
          });

        const result = await getEventTypePermissions(1, 2);

        expect(result).toEqual({
          eventTypes: {
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
          workflows: {
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
        });
      });

      it("should use team OWNER role when org role is ADMIN", async () => {
        (prisma.membership.findFirst as Mock)
          .mockResolvedValueOnce({
            role: MembershipRole.OWNER,
          })
          .mockResolvedValueOnce({
            role: MembershipRole.ADMIN,
          });

        const result = await getEventTypePermissions(1, 2);

        expect(result).toEqual({
          eventTypes: {
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
          workflows: {
            canRead: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
          },
        });
      });

      it("should use org MEMBER role when user has no team membership", async () => {
        (prisma.membership.findFirst as Mock).mockResolvedValueOnce(null).mockResolvedValueOnce({
          role: MembershipRole.MEMBER,
        });

        const result = await getEventTypePermissions(1, 2);

        expect(result).toEqual({
          eventTypes: {
            canRead: true,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
          },
          workflows: {
            canRead: true,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
          },
        });
      });

      it("should throw error when no team or org membership found", async () => {
        (prisma.membership.findFirst as Mock).mockResolvedValue(null);

        await expect(getEventTypePermissions(1, 2)).rejects.toThrow("Membership not found");

        expect(prisma.membership.findFirst).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("error handling", () => {
    it("should propagate errors from FeaturesRepository", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockRejectedValue(new Error("Database connection failed"));

      await expect(getEventTypePermissions(1, 2)).rejects.toThrow("Database connection failed");
    });

    it("should propagate errors from PermissionCheckService", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValue(true);
      mockPermissionCheckService.getResourcePermissions.mockRejectedValue(
        new Error("Permission service error")
      );

      await expect(getEventTypePermissions(1, 2)).rejects.toThrow("Permission service error");
    });

    it("should propagate errors from Prisma membership query", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValue(false);
      (prisma.membership.findFirst as Mock).mockRejectedValue(new Error("Database query failed"));

      await expect(getEventTypePermissions(1, 2)).rejects.toThrow("Database query failed");
    });
  });

  describe("integration scenarios", () => {
    it("should handle switching from PBAC to role-based when PBAC check returns false", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValue(false);
      (prisma.team.findUnique as Mock).mockResolvedValue({ parentId: null });
      (prisma.membership.findFirst as Mock).mockResolvedValue({
        role: MembershipRole.ADMIN,
      });

      const result = await getEventTypePermissions(1, 2);

      expect(mockPermissionCheckService.getResourcePermissions).not.toHaveBeenCalled();
      expect(result.eventTypes.canCreate).toBe(true);
    });

    it("should handle different user and team combinations", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValue(false);
      (prisma.team.findUnique as Mock).mockResolvedValue({ parentId: null });
      (prisma.membership.findFirst as Mock).mockResolvedValue({
        role: MembershipRole.MEMBER,
      });

      const result1 = await getEventTypePermissions(100, 200);
      const result2 = await getEventTypePermissions(101, 201);

      expect(prisma.membership.findFirst).toHaveBeenCalledTimes(2);
      expect(prisma.membership.findFirst).toHaveBeenNthCalledWith(1, {
        where: { userId: 100, teamId: 200 },
        select: { role: true },
      });
      expect(prisma.membership.findFirst).toHaveBeenNthCalledWith(2, {
        where: { userId: 101, teamId: 201 },
        select: { role: true },
      });

      expect(result1).toEqual(result2);
    });
  });

  describe("permission mapping consistency", () => {
    it("should ensure both eventTypes and workflows use same permission structure", async () => {
      mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValue(true);
      mockPermissionCheckService.getResourcePermissions.mockResolvedValue([
        "eventType.read",
        "eventType.update",
      ]);

      const result = await getEventTypePermissions(1, 2);

      expect(Object.keys(result.eventTypes)).toEqual(["canRead", "canCreate", "canUpdate", "canDelete"]);
      expect(Object.keys(result.workflows)).toEqual(["canRead", "canCreate", "canUpdate", "canDelete"]);
    });

    it("should maintain consistent permission types across PBAC and role-based modes", async () => {
      const pbacResult = await (async () => {
        mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValue(true);
        mockPermissionCheckService.getResourcePermissions.mockResolvedValue([
          "eventType.read",
          "eventType.create",
          "eventType.update",
          "eventType.delete",
        ]);
        return await getEventTypePermissions(1, 2);
      })();

      vi.clearAllMocks();

      // Re-initialize mocks after clearing
      vi.mocked(FeaturesRepository).mockImplementation(() => mockFeaturesRepository as any);
      vi.mocked(PermissionCheckService).mockImplementation(() => mockPermissionCheckService as any);
      prisma.membership.findFirst = vi.fn();
      prisma.team.findUnique = vi.fn();

      const roleResult = await (async () => {
        mockFeaturesRepository.checkIfTeamHasFeature.mockResolvedValue(false);
        (prisma.team.findUnique as Mock).mockResolvedValue({ parentId: null });
        (prisma.membership.findFirst as Mock).mockResolvedValue({
          role: MembershipRole.OWNER,
        });
        return await getEventTypePermissions(1, 2);
      })();

      expect(Object.keys(pbacResult.eventTypes)).toEqual(Object.keys(roleResult.eventTypes));
      expect(Object.keys(pbacResult.workflows)).toEqual(Object.keys(roleResult.workflows));
    });
  });
});

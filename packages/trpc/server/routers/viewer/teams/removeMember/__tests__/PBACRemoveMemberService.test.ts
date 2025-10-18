import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";

import * as teamQueries from "@calcom/features/ee/teams/lib/queries";
import { PermissionMapper } from "@calcom/features/pbac/domain/mappers/PermissionMapper";
import { Resource, CustomAction } from "@calcom/features/pbac/domain/types/permission-registry";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { TeamService } from "@calcom/features/ee/teams/services/teamService";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { PBACRemoveMemberService } from "../PBACRemoveMemberService";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    membership: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@calcom/features/ee/teams/services/teamService");
vi.mock("@calcom/features/ee/teams/lib/queries");
vi.mock("@calcom/features/pbac/services/permission-check.service");
vi.mock("@calcom/features/pbac/domain/mappers/PermissionMapper");

describe("PBACRemoveMemberService", () => {
  let service: PBACRemoveMemberService;
  let mockPermissionCheckService: {
    getTeamIdsWithPermission: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPermissionCheckService = {
      getTeamIdsWithPermission: vi.fn(),
    };

    vi.mocked(PermissionCheckService).mockImplementation(() => mockPermissionCheckService as any);

    service = new PBACRemoveMemberService();
  });

  describe("checkRemovePermissions", () => {
    describe("PBAC Permission Checks", () => {
      it("should check team.remove permission for team context", async () => {
        const userId = 1;
        const teamIds = [1, 2];
        const memberIds = [3];
        const isOrg = false;

        const removePermission = "team.remove";
        vi.mocked(PermissionMapper.toPermissionString).mockReturnValue(removePermission);
        mockPermissionCheckService.getTeamIdsWithPermission.mockResolvedValue([1, 2]);

        const result = await service.checkRemovePermissions({
          userId,
          isOrgAdmin: false,
          memberIds,
          teamIds,
          isOrg,
        });

        expect(result.hasPermission).toBe(true);

        expect(PermissionMapper.toPermissionString).toHaveBeenCalledWith({
          resource: Resource.Team,
          action: CustomAction.Remove,
        });

        expect(mockPermissionCheckService.getTeamIdsWithPermission).toHaveBeenCalledWith({
          userId,
          permission: removePermission,
          fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
        });
      });

      it("should check organization.remove permission for org context", async () => {
        const userId = 1;
        const teamIds = [1, 2];
        const memberIds = [3];
        const isOrg = true;

        const removePermission = "organization.remove";
        vi.mocked(PermissionMapper.toPermissionString).mockReturnValue(removePermission);
        mockPermissionCheckService.getTeamIdsWithPermission.mockResolvedValue([1, 2]);

        const result = await service.checkRemovePermissions({
          userId,
          isOrgAdmin: false,
          memberIds,
          teamIds,
          isOrg,
        });

        expect(result.hasPermission).toBe(true);

        expect(PermissionMapper.toPermissionString).toHaveBeenCalledWith({
          resource: Resource.Organization,
          action: CustomAction.Remove,
        });
      });

      it("should deny when user lacks permission for some teams", async () => {
        const userId = 1;
        const teamIds = [1, 2, 3];
        const memberIds = [4];
        const isOrg = false;

        const removePermission = "team.remove";
        vi.mocked(PermissionMapper.toPermissionString).mockReturnValue(removePermission);
        // User only has permission for teams 1 and 2, not 3
        mockPermissionCheckService.getTeamIdsWithPermission.mockResolvedValue([1, 2]);

        const result = await service.checkRemovePermissions({
          userId,
          isOrgAdmin: false,
          memberIds,
          teamIds,
          isOrg,
        });

        expect(result.hasPermission).toBe(false);
      });

      it("should allow when user has permission for all teams", async () => {
        const userId = 1;
        const teamIds = [1, 2, 3];
        const memberIds = [4, 5];
        const isOrg = false;

        const removePermission = "team.remove";
        vi.mocked(PermissionMapper.toPermissionString).mockReturnValue(removePermission);
        mockPermissionCheckService.getTeamIdsWithPermission.mockResolvedValue([1, 2, 3, 4]); // Has more permissions

        const result = await service.checkRemovePermissions({
          userId,
          isOrgAdmin: false,
          memberIds,
          teamIds,
          isOrg,
        });

        expect(result.hasPermission).toBe(true);
      });

      it("should deny when user has no permissions", async () => {
        const userId = 1;
        const teamIds = [1];
        const memberIds = [2];
        const isOrg = false;

        const removePermission = "team.remove";
        vi.mocked(PermissionMapper.toPermissionString).mockReturnValue(removePermission);
        mockPermissionCheckService.getTeamIdsWithPermission.mockResolvedValue([]);

        const result = await service.checkRemovePermissions({
          userId,
          isOrgAdmin: false,
          memberIds,
          teamIds,
          isOrg,
        });

        expect(result.hasPermission).toBe(false);
      });
    });

    describe("Multi-team Operations", () => {
      it("should require permission for ALL teams in request", async () => {
        const userId = 1;
        const teamIds = [10, 20, 30, 40];
        const memberIds = [100];
        const isOrg = false;

        const removePermission = "team.remove";
        vi.mocked(PermissionMapper.toPermissionString).mockReturnValue(removePermission);
        // Missing permission for team 30
        mockPermissionCheckService.getTeamIdsWithPermission.mockResolvedValue([10, 20, 40]);

        const result = await service.checkRemovePermissions({
          userId,
          isOrgAdmin: false,
          memberIds,
          teamIds,
          isOrg,
        });

        expect(result.hasPermission).toBe(false);
      });

      it("should handle large team lists efficiently", async () => {
        const userId = 1;
        const teamIds = Array.from({ length: 100 }, (_, i) => i + 1);
        const memberIds = [999];
        const isOrg = true;

        const removePermission = "organization.remove";
        vi.mocked(PermissionMapper.toPermissionString).mockReturnValue(removePermission);
        mockPermissionCheckService.getTeamIdsWithPermission.mockResolvedValue(teamIds);

        const result = await service.checkRemovePermissions({
          userId,
          isOrgAdmin: false,
          memberIds,
          teamIds,
          isOrg,
        });

        expect(result.hasPermission).toBe(true);
      });
    });
  });

  describe("validateRemoval", () => {
    describe("Owner Protection", () => {
      it("should allow removing owners with PBAC permissions", async () => {
        const userId = 1;
        const memberIds = [2];
        const teamIds = [1];

        vi.mocked(teamQueries.isTeamOwner).mockResolvedValue(true); // Member 2 is owner

        // Get user's role
        vi.mocked(prisma.membership.findMany).mockResolvedValue([
          { id: 1, userId, teamId: 1, role: MembershipRole.ADMIN } as any,
        ]);

        // PBAC service doesn't have owner-to-owner protection logic
        // If user has PBAC remove permission, they can remove owners (unlike Legacy service)
        await expect(
          service.validateRemoval(
            {
              userId,
              isOrgAdmin: false,
              memberIds,
              teamIds,
              isOrg: false,
            },
            true // hasPermission
          )
        ).resolves.not.toThrow();
      });

      it("should allow owner to remove another owner with PBAC", async () => {
        const userId = 1;
        const memberIds = [2];
        const teamIds = [1];

        vi.mocked(teamQueries.isTeamOwner).mockResolvedValue(true); // Member 2 is owner

        // User is owner
        vi.mocked(prisma.membership.findMany).mockResolvedValue([
          { id: 1, userId, teamId: 1, role: MembershipRole.OWNER } as any,
        ]);

        await expect(
          service.validateRemoval(
            {
              userId,
              isOrgAdmin: false,
              memberIds,
              teamIds,
              isOrg: false,
            },
            true
          )
        ).resolves.not.toThrow();
      });
    });

    describe("Self-Removal Prevention", () => {
      it("should prevent owner from removing themselves", async () => {
        const userId = 1;
        const memberIds = [1]; // Same as userId
        const teamIds = [1];

        vi.mocked(teamQueries.isTeamOwner).mockResolvedValue(true); // User is owner of the team

        vi.mocked(prisma.membership.findMany).mockResolvedValue([
          { id: 1, userId, teamId: 1, role: MembershipRole.OWNER } as any,
        ]);

        await expect(
          service.validateRemoval(
            {
              userId,
              isOrgAdmin: false,
              memberIds,
              teamIds,
              isOrg: false,
            },
            true
          )
        ).rejects.toThrow(
          expect.objectContaining({
            code: "FORBIDDEN",
            message: "You can not remove yourself from a team you own.",
          })
        );
      });

      it("should allow admin to remove themselves", async () => {
        const userId = 1;
        const memberIds = [1];
        const teamIds = [1];

        vi.mocked(teamQueries.isTeamOwner).mockResolvedValue(false);

        vi.mocked(prisma.membership.findMany).mockResolvedValue([
          { id: 1, userId, teamId: 1, role: MembershipRole.ADMIN } as any,
        ]);

        await expect(
          service.validateRemoval(
            {
              userId,
              isOrgAdmin: false,
              memberIds,
              teamIds,
              isOrg: false,
            },
            true
          )
        ).resolves.not.toThrow();
      });
    });

    describe("Multi-Member Validation", () => {
      it("should allow removing multiple members including owners", async () => {
        const userId = 1;
        const memberIds = [2, 3, 4];
        const teamIds = [1];

        // User is admin
        vi.mocked(prisma.membership.findMany).mockResolvedValue([
          { id: 1, userId, teamId: 1, role: MembershipRole.ADMIN } as any,
        ]);

        // Member 3 is owner
        vi.mocked(teamQueries.isTeamOwner)
          .mockResolvedValueOnce(false) // member 2
          .mockResolvedValueOnce(true) // member 3 is owner
          .mockResolvedValueOnce(false); // member 4

        // PBAC service doesn't validate owner-to-owner removal
        // It only prevents self-removal by owners
        await expect(
          service.validateRemoval(
            {
              userId,
              isOrgAdmin: false,
              memberIds,
              teamIds,
              isOrg: false,
            },
            true
          )
        ).resolves.not.toThrow();
      });
    });

    describe("Edge Cases", () => {
      it("should handle validation when hasPermission is false", async () => {
        const userId = 1;
        const memberIds = [2];
        const teamIds = [1];

        // Should not perform validation if no permission
        await expect(
          service.validateRemoval(
            {
              userId,
              isOrgAdmin: false,
              memberIds,
              teamIds,
              isOrg: false,
            },
            false // No permission
          )
        ).resolves.not.toThrow();

        // Should not check ownership or roles
        expect(teamQueries.isTeamOwner).not.toHaveBeenCalled();
        expect(prisma.membership.findMany).not.toHaveBeenCalled();
      });
    });
  });

  describe("removeMembers", () => {
    it("should call TeamService.removeMembers with correct parameters", async () => {
      const memberIds = [1, 2, 3];
      const teamIds = [4, 5];
      const isOrg = true;

      vi.mocked(TeamService.removeMembers).mockResolvedValue(undefined);

      await service.removeMembers(memberIds, teamIds, isOrg);

      expect(TeamService.removeMembers).toHaveBeenCalledWith({
        userIds: memberIds,
        teamIds,
        isOrg,
      });
    });

    it("should propagate errors from TeamService", async () => {
      const memberIds = [1];
      const teamIds = [2];
      const isOrg = false;

      const error = new Error("Database connection failed");
      vi.mocked(TeamService.removeMembers).mockRejectedValue(error);

      await expect(service.removeMembers(memberIds, teamIds, isOrg)).rejects.toThrow(
        "Database connection failed"
      );
    });
  });

  describe("Service Initialization", () => {
    it("should create PermissionCheckService on instantiation", () => {
      const newService = new PBACRemoveMemberService();

      expect(PermissionCheckService).toHaveBeenCalled();
    });
  });

  describe("Permission Service Integration", () => {
    it("should handle permission service errors gracefully", async () => {
      const userId = 1;
      const teamIds = [1];
      const memberIds = [2];
      const isOrg = false;

      const removePermission = "team.remove";
      vi.mocked(PermissionMapper.toPermissionString).mockReturnValue(removePermission);

      mockPermissionCheckService.getTeamIdsWithPermission.mockRejectedValue(
        new Error("Permission service unavailable")
      );

      await expect(
        service.checkRemovePermissions({
          userId,
          isOrgAdmin: false,
          memberIds,
          teamIds,
          isOrg,
        })
      ).rejects.toThrow("Permission service unavailable");
    });

    it("should handle empty permission results", async () => {
      const userId = 1;
      const teamIds = [1, 2];
      const memberIds = [3];
      const isOrg = false;

      const removePermission = "team.remove";
      vi.mocked(PermissionMapper.toPermissionString).mockReturnValue(removePermission);
      mockPermissionCheckService.getTeamIdsWithPermission.mockResolvedValue(null as any);

      const result = await service.checkRemovePermissions({
        userId,
        isOrgAdmin: false,
        memberIds,
        teamIds,
        isOrg,
      });

      expect(result.hasPermission).toBe(false);
    });
  });
});

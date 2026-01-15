import { describe, expect, it, vi, beforeEach } from "vitest";

import * as teamQueries from "@calcom/features/ee/teams/lib/queries";
import { TeamService } from "@calcom/features/ee/teams/services/teamService";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { LegacyRemoveMemberService } from "../LegacyRemoveMemberService";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    membership: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@calcom/features/ee/teams/services/teamService");
vi.mock("@calcom/features/ee/teams/lib/queries");

describe("LegacyRemoveMemberService", () => {
  let service: LegacyRemoveMemberService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LegacyRemoveMemberService();
  });

  describe("checkRemovePermissions", () => {
    describe("Org Admin Scenarios", () => {
      it("should allow org admin to remove members from teams they are NOT part of", async () => {
        const userId = 1;
        const isOrgAdmin = true;
        const teamIds = [100, 200]; // Teams the org admin is not part of
        const memberIds = [2, 3];

        const result = await service.checkRemovePermissions({
          userId,
          isOrgAdmin,
          memberIds,
          teamIds,
          isOrg: true,
        });

        expect(result.hasPermission).toBe(true);
        // Should not query database for org admin
        expect(prisma.membership.findMany).not.toHaveBeenCalled();
      });

      it("should bypass membership checks for org admins", async () => {
        const userId = 1;
        const isOrgAdmin = true;
        const teamIds = [1, 2, 3];
        const memberIds = [4, 5, 6];

        const result = await service.checkRemovePermissions({
          userId,
          isOrgAdmin,
          memberIds,
          teamIds,
          isOrg: true,
        });

        expect(result.hasPermission).toBe(true);
        expect(result.userRoles).toBeInstanceOf(Map);

        // Org admin should have ADMIN role for all teams
        teamIds.forEach((teamId) => {
          expect(result.userRoles?.get(teamId)).toBe(MembershipRole.ADMIN);
        });

        // Should not query database
        expect(prisma.membership.findMany).not.toHaveBeenCalled();
      });

      it("should allow org admin to remove from multiple teams at once", async () => {
        const userId = 1;
        const isOrgAdmin = true;
        const teamIds = [1, 2, 3, 4, 5];
        const memberIds = [10, 20];

        const result = await service.checkRemovePermissions({
          userId,
          isOrgAdmin,
          memberIds,
          teamIds,
          isOrg: true,
        });

        expect(result.hasPermission).toBe(true);
        expect(prisma.membership.findMany).not.toHaveBeenCalled();
      });

      it("should work for org admin even with isOrg=false", async () => {
        const userId = 1;
        const isOrgAdmin = true;
        const teamIds = [1];
        const memberIds = [2];

        const result = await service.checkRemovePermissions({
          userId,
          isOrgAdmin,
          memberIds,
          teamIds,
          isOrg: false, // Note: isOrg is false
        });

        expect(result.hasPermission).toBe(true);
        expect(prisma.membership.findMany).not.toHaveBeenCalled();
      });
    });

    describe("Regular User Scenarios", () => {
      it("should allow ADMIN to remove members", async () => {
        const userId = 1;
        const teamIds = [1, 2];
        const memberIds = [3];

        vi.mocked(prisma.membership.findMany).mockResolvedValue([
          { id: 1, userId, teamId: 1, role: MembershipRole.ADMIN } as any,
          { id: 2, userId, teamId: 2, role: MembershipRole.ADMIN } as any,
        ]);

        const result = await service.checkRemovePermissions({
          userId,
          isOrgAdmin: false,
          memberIds,
          teamIds,
          isOrg: false,
        });

        expect(result.hasPermission).toBe(true);
        expect(result.userRoles?.get(1)).toBe(MembershipRole.ADMIN);
        expect(result.userRoles?.get(2)).toBe(MembershipRole.ADMIN);
      });

      it("should allow OWNER to remove members", async () => {
        const userId = 1;
        const teamIds = [1];
        const memberIds = [2];

        vi.mocked(prisma.membership.findMany).mockResolvedValue([
          { id: 1, userId, teamId: 1, role: MembershipRole.OWNER } as any,
        ]);

        const result = await service.checkRemovePermissions({
          userId,
          isOrgAdmin: false,
          memberIds,
          teamIds,
          isOrg: false,
        });

        expect(result.hasPermission).toBe(true);
        expect(result.userRoles?.get(1)).toBe(MembershipRole.OWNER);
      });

      it("should deny MEMBER from removing members", async () => {
        const userId = 1;
        const teamIds = [1];
        const memberIds = [2];

        vi.mocked(prisma.membership.findMany).mockResolvedValue([
          { id: 1, userId, teamId: 1, role: MembershipRole.MEMBER } as any,
        ]);

        const result = await service.checkRemovePermissions({
          userId,
          isOrgAdmin: false,
          memberIds,
          teamIds,
          isOrg: false,
        });

        expect(result.hasPermission).toBe(false);
      });

      it("should deny non-member from removing members", async () => {
        const userId = 1;
        const teamIds = [1];
        const memberIds = [2];

        vi.mocked(prisma.membership.findMany).mockResolvedValue([]);

        const result = await service.checkRemovePermissions({
          userId,
          isOrgAdmin: false,
          memberIds,
          teamIds,
          isOrg: false,
        });

        expect(result.hasPermission).toBe(false);
      });

      it("should require ADMIN/OWNER role in ALL teams for multi-team removal", async () => {
        const userId = 1;
        const teamIds = [1, 2, 3];
        const memberIds = [4];

        vi.mocked(prisma.membership.findMany).mockResolvedValue([
          { id: 1, userId, teamId: 1, role: MembershipRole.ADMIN } as any,
          { id: 2, userId, teamId: 2, role: MembershipRole.MEMBER } as any, // Not admin/owner
          { id: 3, userId, teamId: 3, role: MembershipRole.OWNER } as any,
        ]);

        const result = await service.checkRemovePermissions({
          userId,
          isOrgAdmin: false,
          memberIds,
          teamIds,
          isOrg: false,
        });

        expect(result.hasPermission).toBe(false);
      });

      it("should allow when user has ADMIN/OWNER in all teams", async () => {
        const userId = 1;
        const teamIds = [1, 2, 3];
        const memberIds = [4, 5];

        vi.mocked(prisma.membership.findMany).mockResolvedValue([
          { id: 1, userId, teamId: 1, role: MembershipRole.ADMIN } as any,
          { id: 2, userId, teamId: 2, role: MembershipRole.OWNER } as any,
          { id: 3, userId, teamId: 3, role: MembershipRole.ADMIN } as any,
        ]);

        const result = await service.checkRemovePermissions({
          userId,
          isOrgAdmin: false,
          memberIds,
          teamIds,
          isOrg: false,
        });

        expect(result.hasPermission).toBe(true);
      });
    });
  });

  describe("validateRemoval", () => {
    describe("Owner Protection", () => {
      it("should prevent non-owner from removing owner", async () => {
        const userId = 1;
        const memberIds = [2];
        const teamIds = [1];
        const userRoles = new Map([[1, MembershipRole.ADMIN]]);

        // Member 2 is owner, but userId 1 is not owner
        vi.mocked(teamQueries.isTeamOwner)
          .mockResolvedValueOnce(true) // isTeamOwner(2, 1) - member is owner
          .mockResolvedValueOnce(false); // isTeamOwner(1, 1) - current user is not owner

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
            code: "UNAUTHORIZED",
            message: "Only a team owner can remove another team owner.",
          })
        );
      });

      it("should allow owner to remove another owner", async () => {
        const userId = 1;
        const memberIds = [2];
        const teamIds = [1];
        const userRoles = new Map([[1, MembershipRole.OWNER]]);

        vi.mocked(teamQueries.isTeamOwner).mockResolvedValue(true);

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

      it("should allow org admin to remove owner", async () => {
        const userId = 1;
        const memberIds = [2];
        const teamIds = [1];
        const userRoles = new Map([[1, MembershipRole.ADMIN]]);

        vi.mocked(teamQueries.isTeamOwner).mockResolvedValue(true);

        // Org admin can remove owner
        await expect(
          service.validateRemoval(
            {
              userId,
              isOrgAdmin: true, // Org admin
              memberIds,
              teamIds,
              isOrg: true,
            },
            { hasPermission: true, userRoles }
          )
        ).resolves.not.toThrow();

        // isTeamOwner should not be called for org admins
        expect(teamQueries.isTeamOwner).not.toHaveBeenCalled();
      });
    });

    describe("Self-Removal Prevention", () => {
      it("should prevent owner from removing themselves", async () => {
        const userId = 1;
        const memberIds = [1]; // Same as userId
        const teamIds = [1];
        const userRoles = new Map([[1, MembershipRole.OWNER]]);

        vi.mocked(teamQueries.isTeamOwner).mockResolvedValue(true); // User is owner

        await expect(
          service.validateRemoval(
            {
              userId,
              isOrgAdmin: false,
              memberIds,
              teamIds,
              isOrg: false,
            },
            true // hasPermission - this should be boolean, not object
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
        const memberIds = [1]; // Same as userId
        const teamIds = [1];
        const userRoles = new Map([[1, MembershipRole.ADMIN]]);

        vi.mocked(teamQueries.isTeamOwner).mockResolvedValue(false);

        await expect(
          service.validateRemoval(
            {
              userId,
              isOrgAdmin: false,
              memberIds,
              teamIds,
              isOrg: false,
            },
            { hasPermission: true, userRoles }
          )
        ).resolves.not.toThrow();
      });

      it("should allow member to remove themselves", async () => {
        const userId = 1;
        const memberIds = [1]; // Same as userId
        const teamIds = [1];
        const userRoles = new Map([[1, MembershipRole.MEMBER]]);

        vi.mocked(teamQueries.isTeamOwner).mockResolvedValue(false);

        await expect(
          service.validateRemoval(
            {
              userId,
              isOrgAdmin: false,
              memberIds,
              teamIds,
              isOrg: false,
            },
            { hasPermission: true, userRoles }
          )
        ).resolves.not.toThrow();
      });
    });

    describe("Multi-Member Validation", () => {
      it("should validate each member independently", async () => {
        const userId = 1;
        const memberIds = [2, 3, 4];
        const teamIds = [1];
        const userRoles = new Map([[1, MembershipRole.ADMIN]]);

        // Member 2 is not owner, member 3 is owner, member 4 is not owner
        // Current user (1) is not owner
        vi.mocked(teamQueries.isTeamOwner)
          .mockResolvedValueOnce(false) // isTeamOwner(2, 1) - member 2 is not owner
          .mockResolvedValueOnce(true) // isTeamOwner(3, 1) - member 3 is owner
          .mockResolvedValueOnce(false) // isTeamOwner(1, 1) - current user is not owner
          .mockResolvedValueOnce(false); // isTeamOwner(4, 1) - member 4 is not owner (if reached)

        await expect(
          service.validateRemoval(
            {
              userId,
              isOrgAdmin: false,
              memberIds,
              teamIds,
              isOrg: false,
            },
            { hasPermission: true, userRoles }
          )
        ).rejects.toThrow(
          expect.objectContaining({
            code: "UNAUTHORIZED",
            message: "Only a team owner can remove another team owner.",
          })
        );

        expect(teamQueries.isTeamOwner).toHaveBeenCalledTimes(4); // Checks member 2, user 1, member 3 (owner), user 1
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

      const error = new Error("Database error");
      vi.mocked(TeamService.removeMembers).mockRejectedValue(error);

      await expect(service.removeMembers(memberIds, teamIds, isOrg)).rejects.toThrow("Database error");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty memberIds array", async () => {
      const userId = 1;
      const memberIds: number[] = [];
      const teamIds = [1];

      const result = await service.checkRemovePermissions({
        userId,
        isOrgAdmin: false,
        memberIds,
        teamIds,
        isOrg: false,
      });

      // Should still check permissions even with no members to remove
      expect(prisma.membership.findMany).toHaveBeenCalled();
    });

    it("should handle permission check with no teams in database", async () => {
      const userId = 1;
      const teamIds = [999]; // Non-existent team
      const memberIds = [2];

      vi.mocked(prisma.membership.findMany).mockResolvedValue([]);

      const result = await service.checkRemovePermissions({
        userId,
        isOrgAdmin: false,
        memberIds,
        teamIds,
        isOrg: false,
      });

      expect(result.hasPermission).toBe(false);
    });
  });
});

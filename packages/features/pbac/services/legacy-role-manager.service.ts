import { isTeamOwner } from "@calcom/features/ee/teams/lib/queries";
import { isOrganisationAdmin, isOrganisationOwner } from "@calcom/features/pbac/utils/isOrganisationAdmin";
import { prisma } from "@calcom/prisma";
import type { Membership } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { RoleManagementError, RoleManagementErrorCode } from "../domain/errors/role-management.error";
import type { IRoleManager } from "./role-manager.interface";

export class LegacyRoleManager implements IRoleManager {
  public isPBACEnabled = false;

  protected async validateRoleChange(
    userId: number,
    teamId: number,
    memberId: number,
    newRole: MembershipRole | string,
    memberships: Membership[]
  ): Promise<void> {
    // Only validate for traditional MembershipRole values
    if (typeof newRole !== "string" || !Object.values(MembershipRole).includes(newRole as MembershipRole)) {
      return;
    }

    const targetMembership = memberships.find((m) => m.userId === memberId);
    const myMembership = memberships.find((m) => m.userId === userId);
    const teamOwners = memberships.filter((m) => m.role === MembershipRole.OWNER);
    const teamHasMoreThanOneOwner = teamOwners.length > 1;

    if (!targetMembership) {
      throw new RoleManagementError("Target membership not found", RoleManagementErrorCode.UNAUTHORIZED);
    }

    // Only owners can award owner role
    if (newRole === MembershipRole.OWNER && !(await isTeamOwner(userId, teamId))) {
      throw new RoleManagementError("Only owners can award owner role", RoleManagementErrorCode.UNAUTHORIZED);
    }

    // Admins cannot change the role of an owner
    if (myMembership?.role === MembershipRole.ADMIN && targetMembership?.role === MembershipRole.OWNER) {
      throw new RoleManagementError(
        "You can not change the role of an owner if you are an admin.",
        RoleManagementErrorCode.UNAUTHORIZED
      );
    }

    // Cannot change the role of the only owner
    if (targetMembership?.role === MembershipRole.OWNER && !teamHasMoreThanOneOwner) {
      throw new RoleManagementError(
        "You can not change the role of the only owner of a team.",
        RoleManagementErrorCode.UNAUTHORIZED
      );
    }

    // Admins cannot promote themselves to a higher role (except to MEMBER which is a demotion)
    if (
      myMembership?.role === MembershipRole.ADMIN &&
      memberId === userId &&
      newRole !== MembershipRole.MEMBER
    ) {
      throw new RoleManagementError(
        "You can not change yourself to a higher role.",
        RoleManagementErrorCode.UNAUTHORIZED
      );
    }
  }

  async checkPermissionToChangeRole(
    userId: number,
    targetId: number,
    scope: "org" | "team",
    memberId?: number,
    newRole?: MembershipRole | string
  ): Promise<void> {
    let hasPermission = false;
    const isOwnerChange = newRole === MembershipRole.OWNER;
    if (scope === "team") {
      const team = await prisma.membership.findFirst({
        where: {
          userId,
          teamId: targetId,
          accepted: true,
          OR: [{ role: "ADMIN" }, { role: "OWNER" }],
        },
      });
      hasPermission = !!team;
    } else {
      hasPermission =
        newRole === MembershipRole.OWNER
          ? !!(await isOrganisationOwner(userId, targetId))
          : !!(await isOrganisationAdmin(userId, targetId));
    }

    // Only OWNER/ADMIN can update role
    if (!hasPermission) {
      throw new RoleManagementError(
        isOwnerChange ? "Only owners can update this role" : "Only owners or admin can update roles",
        RoleManagementErrorCode.UNAUTHORIZED
      );
    }

    // Additional validation for team role changes in legacy mode
    if (scope === "team" && memberId && newRole) {
      const memberships = await prisma.membership.findMany({
        where: {
          teamId: targetId,
          accepted: true,
        },
      });
      await this.validateRoleChange(userId, targetId, memberId, newRole, memberships);
    }
  }

  async assignRole(
    userId: number,
    organizationId: number,
    role: MembershipRole | string,
    // Used in other implementation

    _membershipId: number
  ): Promise<void> {
    await prisma.membership.update({
      where: {
        userId_teamId: {
          userId,
          teamId: organizationId,
        },
      },
      data: {
        role: role as MembershipRole,
      },
    });
  }

  // Used in other implementation

  async getAllRoles(_organizationId: number): Promise<{ id: string; name: string }[]> {
    return [
      { id: MembershipRole.OWNER, name: "Owner" },
      { id: MembershipRole.ADMIN, name: "Admin" },
      { id: MembershipRole.MEMBER, name: "Member" },
    ];
  }

  // Used in other implementation

  async getTeamRoles(_teamId: number): Promise<{ id: string; name: string }[]> {
    return [
      { id: MembershipRole.OWNER, name: "Owner" },
      { id: MembershipRole.ADMIN, name: "Admin" },
      { id: MembershipRole.MEMBER, name: "Member" },
    ];
  }
}

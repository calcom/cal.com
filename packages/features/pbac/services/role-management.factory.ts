import { isTeamOwner } from "@calcom/features/ee/teams/lib/queries";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { prisma } from "@calcom/prisma";
import type { Membership } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { RoleManagementError, RoleManagementErrorCode } from "../domain/errors/role-management.error";
import { DEFAULT_ROLE_IDS } from "../lib/constants";
import { PermissionCheckService } from "./permission-check.service";
import { RoleService } from "./role.service";

interface IRoleManager {
  isPBACEnabled: boolean;
  checkPermissionToChangeRole(
    userId: number,
    targetId: number,
    scope: "org" | "team",
    memberId?: number,
    newRole?: MembershipRole | string
  ): Promise<void>;
  assignRole(
    userId: number,
    organizationId: number,
    role: MembershipRole | string,
    membershipId: number
  ): Promise<void>;
  getAllRoles(organizationId: number): Promise<{ id: string; name: string }[]>;
  getTeamRoles(teamId: number): Promise<{ id: string; name: string }[]>;
}

class PBACRoleManager implements IRoleManager {
  public isPBACEnabled = true;

  constructor(
    private readonly roleService: RoleService,
    private readonly permissionCheckService: PermissionCheckService
  ) {}

  async checkPermissionToChangeRole(
    userId: number,
    targetId: number,
    scope: "org" | "team",
    // Not required for this instance
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _memberId?: number,
    // Not required for this instance
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _newRole?: MembershipRole | string
  ): Promise<void> {
    const hasPermission = await this.permissionCheckService.checkPermission({
      userId,
      teamId: targetId,
      permission: scope === "team" ? "team.changeMemberRole" : "organization.changeMemberRole",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });

    if (!hasPermission) {
      throw new RoleManagementError(
        "You do not have permission to change roles",
        RoleManagementErrorCode.UNAUTHORIZED
      );
    }
  }

  async assignRole(
    _userId: number,
    organizationId: number,
    role: MembershipRole | string,
    membershipId: number
  ): Promise<void> {
    // Check if role is one of the default MembershipRole enum values
    const isDefaultRole = role in DEFAULT_ROLE_IDS;

    // Also check if the role is a default role ID value
    const isDefaultRoleId = Object.values(DEFAULT_ROLE_IDS).includes(role as any);

    if (isDefaultRole) {
      // Handle enum values like MembershipRole.ADMIN
      await this.roleService.assignRoleToMember(DEFAULT_ROLE_IDS[role as MembershipRole], membershipId);
    } else if (isDefaultRoleId) {
      // Handle default role IDs like "admin_role"
      await this.roleService.assignRoleToMember(role as string, membershipId);
    } else {
      // Handle custom roles
      const roleExists = await this.roleService.roleBelongsToTeam(role as string, organizationId);
      if (!roleExists) {
        throw new RoleManagementError(
          "You do not have access to this role",
          RoleManagementErrorCode.INVALID_ROLE
        );
      }
      await this.roleService.assignRoleToMember(role as string, membershipId);
    }
  }

  async getAllRoles(organizationId: number): Promise<{ id: string; name: string }[]> {
    const roles = await this.roleService.getTeamRoles(organizationId);
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
    }));
  }

  async getTeamRoles(teamId: number): Promise<{ id: string; name: string }[]> {
    const roles = await this.roleService.getTeamRoles(teamId);
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
    }));
  }
}

class LegacyRoleManager implements IRoleManager {
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
      hasPermission = !!(await isOrganisationAdmin(userId, targetId));
    }

    // Only OWNER/ADMIN can update role
    if (!hasPermission) {
      throw new RoleManagementError(
        "Only owners or admin can update roles",
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAllRoles(_organizationId: number): Promise<{ id: string; name: string }[]> {
    return [
      { id: MembershipRole.OWNER, name: "Owner" },
      { id: MembershipRole.ADMIN, name: "Admin" },
      { id: MembershipRole.MEMBER, name: "Member" },
    ];
  }

  // Used in other implementation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTeamRoles(_teamId: number): Promise<{ id: string; name: string }[]> {
    return [
      { id: MembershipRole.OWNER, name: "Owner" },
      { id: MembershipRole.ADMIN, name: "Admin" },
      { id: MembershipRole.MEMBER, name: "Member" },
    ];
  }
}

export { LegacyRoleManager };

export class RoleManagementFactory {
  private static instance: RoleManagementFactory;
  private featuresRepository: FeaturesRepository;
  private roleService: RoleService;
  private permissionCheckService: PermissionCheckService;

  private constructor() {
    // Not used but needed for DI
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    (this.featuresRepository = new FeaturesRepository(prisma)), (this.roleService = new RoleService());
    this.permissionCheckService = new PermissionCheckService();
  }

  public static getInstance(): RoleManagementFactory {
    if (!RoleManagementFactory.instance) {
      RoleManagementFactory.instance = new RoleManagementFactory();
    }
    return RoleManagementFactory.instance;
  }

  async createRoleManager(organizationId: number): Promise<IRoleManager> {
    const isPBACEnabled = await this.featuresRepository.checkIfTeamHasFeature(organizationId, "pbac");

    return isPBACEnabled
      ? new PBACRoleManager(this.roleService, this.permissionCheckService)
      : new LegacyRoleManager();
  }
}

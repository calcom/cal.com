import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { RoleManagementError, RoleManagementErrorCode } from "../domain/errors/role-management.error";
import { DEFAULT_ROLE_IDS } from "../lib/constants";
import { PermissionCheckService } from "./permission-check.service";
import { RoleService } from "./role.service";

interface IRoleManager {
  isPBACEnabled: boolean;
  checkPermissionToChangeRole(userId: number, organizationId: number): Promise<void>;
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

  async checkPermissionToChangeRole(userId: number, organizationId: number): Promise<void> {
    const hasPermission = await this.permissionCheckService.checkPermission({
      userId,
      teamId: organizationId,
      permission: "organization.changeMemberRole",
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
  async checkPermissionToChangeRole(userId: number, organizationId: number): Promise<void> {
    const membership = await isOrganisationAdmin(userId, organizationId);

    // Only OWNER/ADMIN can update role
    if (!membership) {
      throw new RoleManagementError(
        "Only owners or admin can update roles",
        RoleManagementErrorCode.UNAUTHORIZED
      );
    }
  }

  async assignRole(
    userId: number,
    organizationId: number,
    role: MembershipRole | string,
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

  async getAllRoles(_organizationId: number): Promise<{ id: string; name: string }[]> {
    return [
      { id: MembershipRole.OWNER, name: "Owner" },
      { id: MembershipRole.ADMIN, name: "Admin" },
      { id: MembershipRole.MEMBER, name: "Member" },
    ];
  }

  async getTeamRoles(_teamId: number): Promise<{ id: string; name: string }[]> {
    return [
      { id: MembershipRole.OWNER, name: "Owner" },
      { id: MembershipRole.ADMIN, name: "Admin" },
      { id: MembershipRole.MEMBER, name: "Member" },
    ];
  }
}

export class RoleManagementFactory {
  private static instance: RoleManagementFactory;
  private featuresRepository: FeaturesRepository;
  private roleService: RoleService;
  private permissionCheckService: PermissionCheckService;

  private constructor() {
    this.featuresRepository = new FeaturesRepository();
    this.roleService = new RoleService();
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

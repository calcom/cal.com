import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

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
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
  }

  async assignRole(
    userId: number,
    organizationId: number,
    role: MembershipRole,
    membershipId: number
  ): Promise<void> {
    const isDefaultRole = role in DEFAULT_ROLE_IDS;

    if (isDefaultRole) {
      await this.roleService.assignRoleToMember(DEFAULT_ROLE_IDS[role], membershipId);
    } else {
      const roleExists = await this.roleService.roleBelongsToTeam(role, organizationId);
      if (!roleExists) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "You do not have access to this role" });
      }
      await this.roleService.assignRoleToMember(role, membershipId);
    }
  }

  async getAllRoles(organizationId: number): Promise<{ id: string; name: string }[]> {
    const roles = await this.roleService.getTeamRoles(organizationId);
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
    }));
  }
}

class LegacyRoleManager implements IRoleManager {
  public isPBACEnabled = false;
  async checkPermissionToChangeRole(userId: number, organizationId: number): Promise<void> {
    const isUpdaterAnOwner = await isOrganisationAdmin(userId, organizationId);

    // Only OWNER can update role to OWNER
    if (!isUpdaterAnOwner) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
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

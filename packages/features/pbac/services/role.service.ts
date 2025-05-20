import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole, RoleType } from "@calcom/prisma/enums";

import type { PermissionString, Resource, CrudAction, CustomAction } from "../types/permission-registry";
import { PermissionService } from "./permission.service";

// These IDs must match the ones in the migration
const DEFAULT_ROLE_IDS = {
  [MembershipRole.OWNER]: "owner_role",
  [MembershipRole.ADMIN]: "admin_role",
  [MembershipRole.MEMBER]: "member_role",
} as const;

export class RoleService {
  private prisma: PrismaClient;
  private permissionService: PermissionService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.permissionService = new PermissionService();
  }

  async createRole(data: {
    name: string;
    description?: string;
    teamId?: number;
    permissions: PermissionString[];
  }) {
    // Check if role name conflicts with default roles
    const existingRole = await this.prisma.role.findFirst({
      where: {
        name: data.name,
        teamId: data.teamId,
      },
    });

    if (existingRole) {
      throw new Error(`Role with name "${data.name}" already exists`);
    }

    // Validate permissions
    if (!this.permissionService.validatePermissions(data.permissions)) {
      throw new Error("Invalid permissions provided");
    }

    return this.prisma.$transaction(async (tx) => {
      // Create role
      const role = await tx.role.create({
        data: {
          name: data.name,
          description: data.description,
          teamId: data.teamId,
          type: RoleType.CUSTOM,
        },
      });

      // Create permissions
      await tx.rolePermission.createMany({
        data: data.permissions.map((permission) => {
          const [resource, action] = permission.split(".") as [Resource, CrudAction | CustomAction];
          return { roleId: role.id, resource, action };
        }),
      });

      const permissions = await tx.rolePermission.findMany({
        where: { roleId: role.id },
      });

      return { ...role, permissions };
    });
  }

  async getDefaultRoleId(role: MembershipRole): Promise<string> {
    return DEFAULT_ROLE_IDS[role];
  }

  async assignRoleToMember(roleId: string, membershipId: number) {
    return this.prisma.membership.update({
      where: { id: membershipId },
      data: { customRoleId: roleId },
    });
  }

  async getRolePermissions(roleId: string) {
    return this.prisma.rolePermission.findMany({
      where: { roleId },
    });
  }

  async removeRoleFromMember(membershipId: number) {
    return this.prisma.membership.update({
      where: { id: membershipId },
      data: { customRoleId: null },
    });
  }

  async changeUserRole(membershipId: number, roleId: string) {
    // Verify role exists first
    const role = await this.getRole(roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    return this.prisma.membership.update({
      where: { id: membershipId },
      data: { customRoleId: roleId },
      include: {
        customRole: {
          include: {
            permissions: true,
          },
        },
      },
    });
  }

  async deleteRole(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new Error("Role not found");
    }

    // Don't allow deleting default roles
    if (role.type === RoleType.SYSTEM) {
      throw new Error("Cannot delete default roles");
    }

    return this.prisma.$transaction(async (tx) => {
      // Delete permissions first
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      // Then delete the role
      return tx.role.delete({
        where: { id: roleId },
      });
    });
  }

  async getRole(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: true,
      },
    });

    if (!role) return null;

    return role;
  }

  async getTeamRoles(teamId: number) {
    // Get both team-specific roles and default roles
    const roles = await this.prisma.role.findMany({
      where: {
        OR: [{ teamId }, { type: RoleType.SYSTEM }],
      },
      include: {
        permissions: true,
      },
    });

    return roles;
  }

  async updateRolePermissions(roleId: string, permissions: PermissionString[]) {
    const role = await this.getRole(roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // Don't allow updating default roles
    if (role.type === RoleType.SYSTEM) {
      throw new Error("Cannot update default roles");
    }

    // Validate permissions
    if (!this.permissionService.validatePermissions(permissions)) {
      throw new Error("Invalid permissions provided");
    }

    return this.prisma.$transaction(async (tx) => {
      // Delete existing permissions
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      // Create new permissions
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => {
          const [resource, action] = permission.split(".") as [Resource, CrudAction | CustomAction];
          return { roleId, resource, action };
        }),
      });

      return this.getRole(roleId);
    });
  }
}

import type { PrismaClient } from "@prisma/client";

import type { PermissionString, Resource, CrudAction, CustomAction } from "../types/permission-registry";
import { PermissionService } from "./permission.service";

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
    });

    if (!role) return null;

    const permissions = await this.getRolePermissions(roleId);
    return { ...role, permissions };
  }

  async getTeamRoles(teamId: number) {
    const roles = await this.prisma.role.findMany({
      where: { teamId },
    });

    const permissions = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roles.map((r) => r.id) } },
    });

    return roles.map((role) => ({
      ...role,
      permissions: permissions.filter((p) => p.roleId === role.id),
    }));
  }

  async updateRolePermissions(roleId: string, permissions: PermissionString[]) {
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

      const role = await tx.role.findUnique({
        where: { id: roleId },
      });

      if (!role) return null;

      const updatedPermissions = await tx.rolePermission.findMany({
        where: { roleId },
      });

      return { ...role, permissions: updatedPermissions };
    });
  }
}

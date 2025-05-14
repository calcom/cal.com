import type { PrismaClient } from "@prisma/client";

import type { PermissionString, Resource, Action } from "../types/permission-registry";
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

    // Create role with permissions
    return this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        teamId: data.teamId,
        permissions: {
          create: data.permissions.map((permission) => {
            const [resource, action] = permission.split(".") as [Resource, Action];
            return { resource, action };
          }),
        },
      },
      include: {
        permissions: true,
      },
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

  async deleteRole(roleId: string) {
    return this.prisma.role.delete({
      where: { id: roleId },
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

    // Delete existing permissions
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Create new permissions
    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: {
          create: permissions.map((permission) => {
            const [resource, action] = permission.split(".") as [Resource, Action];
            return { resource, action };
          }),
        },
      },
      include: {
        permissions: true,
      },
    });
  }
}

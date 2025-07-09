import type { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import db from "@calcom/prisma";

import type { Role, RolePermission } from "../../domain/types/role";

type PermissionChange = {
  resource: string;
  action: string;
};

export class RoleRepository {
  constructor(private readonly client: PrismaClient = db) {}

  async update(
    roleId: string,
    permissionChanges: {
      toAdd: PermissionChange[];
      toRemove: PermissionChange[];
    },
    updates?: {
      color?: string;
      name?: string;
      description?: string;
    }
  ) {
    await this.client.$transaction(async (trx) => {
      // Update role metadata if provided
      if (updates) {
        const updateData: Record<string, any> = {};
        if (updates.color !== undefined) updateData.color = updates.color || null;
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.description !== undefined) updateData.description = updates.description || null;
        await trx.role.update({ where: { id: roleId }, data: updateData });
      }

      // Remove permissions that are no longer needed
      if (permissionChanges.toRemove.length > 0) {
        await trx.rolePermission.deleteMany({
          where: {
            roleId,
            AND: permissionChanges.toRemove.map((p) => ({
              resource: p.resource,
              action: p.action,
            })),
          },
        });
      }

      // Add new permissions
      if (permissionChanges.toAdd.length > 0) {
        const permissionData = permissionChanges.toAdd.map((permission) => ({
          id: uuidv4(),
          roleId,
          resource: permission.resource,
          action: permission.action,
        }));

        await trx.rolePermission.createMany({ data: permissionData });
      }
    });

    // Fetch complete role with permissions
    const completeRole = await this.findById(roleId);
    if (!completeRole) throw new Error("Failed to update role");
    return completeRole;
  }

  async findById(roleId: string): Promise<Role | null> {
    return this.client.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: true,
      },
    });
  }

  async getPermissions(roleId: string): Promise<RolePermission[]> {
    return this.client.rolePermission.findMany({
      where: { roleId },
    });
  }
}

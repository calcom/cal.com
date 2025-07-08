import { v4 as uuidv4 } from "uuid";

import db from "@calcom/prisma";
import type { PrismaClient as PrismaClientWithExtensions, PrismaTransaction } from "@calcom/prisma";

import { RoleMapper } from "../../domain/mappers/RoleMapper";
import { RoleType } from "../../domain/models/Role";
import type { CreateRoleData } from "../../domain/models/Role";
import type { IRoleRepository } from "../../domain/repositories/IRoleRepository";
import type { PermissionString } from "../../domain/types/permission-registry";

export class RoleRepository implements IRoleRepository {
  private client: PrismaClientWithExtensions | PrismaTransaction;

  constructor(client: PrismaClientWithExtensions | PrismaTransaction = db) {
    this.client = client;
  }

  setTransaction(trx: PrismaClientWithExtensions | PrismaTransaction) {
    this.client = trx;
  }

  async findByName(name: string, teamId?: number) {
    const role = await this.client.role.findFirst({
      where: {
        name,
        teamId: teamId ?? null,
      },
      include: {
        permissions: true,
      },
    });
    return role
      ? RoleMapper.toDomain({ ...role, permissions: role.permissions, color: role.color ?? null })
      : null;
  }

  async findById(id: string) {
    const role = await this.client.role.findUnique({
      where: { id },
      include: {
        permissions: true,
      },
    });
    return role
      ? RoleMapper.toDomain({ ...role, permissions: role.permissions, color: role.color ?? null })
      : null;
  }

  async findByTeamId(teamId: number) {
    const roles = await this.client.role.findMany({
      where: {
        OR: [{ teamId }, { type: RoleType.SYSTEM }],
      },
      include: {
        permissions: true,
      },
    });
    return roles.map((role) =>
      RoleMapper.toDomain({ ...role, permissions: role.permissions, color: role.color ?? null })
    );
  }

  async create(data: CreateRoleData) {
    const roleId = uuidv4();
    const now = new Date();
    // Create role
    await this.client.role.create({
      data: {
        id: roleId,
        name: data.name,
        description: data.description || null,
        teamId: data.teamId || null,
        type: data.type || RoleType.CUSTOM,
        color: data.color || null,
        createdAt: now,
        updatedAt: now,
      },
    });
    // Create permissions only if there are any
    if (data.permissions.length > 0) {
      const permissionData = data.permissions.map((permission) => {
        const [resource, action] = permission.split(".");
        return {
          id: uuidv4(),
          roleId,
          resource,
          action,
        };
      });
      await this.client.rolePermission.createMany({ data: permissionData });
    }
    // Fetch complete role with permissions
    const completeRole = await this.findById(roleId);
    if (!completeRole) throw new Error("Failed to create role");
    return completeRole;
  }

  async delete(id: string) {
    await this.client.rolePermission.deleteMany({ where: { roleId: id } });
    await this.client.role.delete({ where: { id } });
  }

  async update(
    roleId: string,
    permissions: PermissionString[],
    updates?: {
      color?: string;
      name?: string;
      description?: string;
    }
  ) {
    // Update role metadata if provided
    if (updates) {
      const updateData: Record<string, any> = {};
      if (updates.color !== undefined) {
        updateData.color = updates.color || null;
      }
      if (updates.name !== undefined) {
        updateData.name = updates.name;
      }
      if (updates.description !== undefined) {
        updateData.description = updates.description || null;
      }
      await this.client.role.update({ where: { id: roleId }, data: updateData });
    }
    // Delete existing permissions
    await this.client.rolePermission.deleteMany({ where: { roleId } });
    // Create new permissions
    const permissionData = permissions.map((permission) => {
      const [resource, action] = permission.split(".");
      return {
        id: uuidv4(),
        roleId,
        resource,
        action,
      };
    });
    await this.client.rolePermission.createMany({ data: permissionData });
    // Fetch updated role
    const updatedRole = await this.findById(roleId);
    if (!updatedRole) throw new Error("Failed to update role permissions");
    return updatedRole;
  }

  async roleBelongsToTeam(roleId: string, teamId: number) {
    const role = await this.findById(roleId);
    return role?.teamId === teamId;
  }
}

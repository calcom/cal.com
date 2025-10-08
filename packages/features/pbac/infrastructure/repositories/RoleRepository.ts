import { v4 as uuidv4 } from "uuid";

import type { PrismaClient as PrismaWithExtensions } from "@calcom/prisma";
import db from "@calcom/prisma";

import type { Role, RolePermission, PermissionChange, CreateRoleData } from "../../domain/models/Role";
import { RoleType } from "../../domain/models/Role";
import { parsePermissionString } from "../../domain/types/permission-registry";
import { RoleOutputMapper } from "../mappers/RoleOutputMapper";

export class RoleRepository {
  constructor(private readonly client: PrismaWithExtensions = db) {}

  async findByName(name: string, teamId?: number): Promise<Role | null> {
    const role = await this.client.role.findFirst({
      where: { name, teamId: teamId ?? null },
      include: { permissions: true },
    });
    return role ? RoleOutputMapper.toDomain(role) : null;
  }

  async findByTeamId(teamId: number): Promise<Role[]> {
    const roles = await this.client.role.findMany({
      where: {
        OR: [
          { teamId }, // Team-specific custom roles
          { teamId: null, type: "SYSTEM" }, // Default/system roles available to all teams
        ],
      },
      include: { permissions: true },
    });
    return RoleOutputMapper.toDomainList(roles);
  }

  async roleBelongsToTeam(roleId: string, teamId: number): Promise<boolean> {
    const role = await this.client.role.findUnique({
      where: { id: roleId },
      select: { teamId: true },
    });
    return role?.teamId === teamId;
  }

  async create(data: CreateRoleData): Promise<Role> {
    const roleId = await this.client.$transaction(async (trx) => {
      const role = await trx.role.create({
        data: {
          id: uuidv4(),
          name: data.name,
          color: data.color ?? null,
          description: data.description ?? null,
          teamId: data.teamId ?? null,
          type: data.type ?? RoleType.CUSTOM,
        },
      });

      if (data.permissions.length > 0) {
        const permissionData = data.permissions.map((permission) => {
          const { resource, action } = parsePermissionString(permission);
          return {
            id: uuidv4(),
            roleId: role.id,
            resource,
            action,
          };
        });

        await trx.rolePermission.createMany({ data: permissionData });
      }
      return role.id;
    });

    const completeRole = await this.findById(roleId);
    if (!completeRole) throw new Error("Failed to create role");

    return completeRole;
  }

  async delete(id: string): Promise<void> {
    await this.client.$transaction([
      this.client.rolePermission.deleteMany({ where: { roleId: id } }),
      this.client.role.delete({ where: { id } }),
    ]);
  }

  async reassignUsersToRole(fromRoleId: string, toRoleId: string): Promise<void> {
    await this.client.membership.updateMany({
      where: { customRoleId: fromRoleId },
      data: { customRoleId: toRoleId },
    });
  }

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
            OR: permissionChanges.toRemove.map((p) => ({
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
    const role = await this.client.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: true,
      },
    });
    return role ? RoleOutputMapper.toDomain(role) : null;
  }

  async getPermissions(roleId: string): Promise<RolePermission[]> {
    const permissions = await this.client.rolePermission.findMany({
      where: { roleId },
    });
    return permissions.map(RoleOutputMapper.toDomainPermission);
  }
}

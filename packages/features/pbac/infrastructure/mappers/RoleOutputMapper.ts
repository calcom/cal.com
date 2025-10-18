import type { Role as PrismaRole, RolePermission as PrismaRolePermission } from "@calcom/prisma/client";

import type { Role, RolePermission } from "../../domain/models/Role";

export class RoleOutputMapper {
  static toDomain(prismaRole: PrismaRole & { permissions: PrismaRolePermission[] }): Role {
    return {
      id: prismaRole.id,
      name: prismaRole.name,
      color: prismaRole.color || undefined,
      description: prismaRole.description || undefined,
      teamId: prismaRole.teamId || undefined,
      type: prismaRole.type,
      permissions: prismaRole.permissions.map(RoleOutputMapper.toDomainPermission),
      createdAt: prismaRole.createdAt,
      updatedAt: prismaRole.updatedAt,
    };
  }

  static toDomainPermission(prismaPermission: PrismaRolePermission): RolePermission {
    return {
      id: prismaPermission.id,
      roleId: prismaPermission.roleId,
      resource: prismaPermission.resource,
      action: prismaPermission.action,
      createdAt: prismaPermission.createdAt,
    };
  }

  static toDomainList(prismaRoles: (PrismaRole & { permissions: PrismaRolePermission[] })[]): Role[] {
    return prismaRoles.map(RoleOutputMapper.toDomain);
  }
}

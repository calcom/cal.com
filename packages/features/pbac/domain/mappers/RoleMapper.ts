import type { RoleType } from "@calcom/kysely/types";

import type { Role, RolePermission, RoleType as DomainRoleType } from "../models/Role";

type KyselyRole = {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  teamId: number | null;
  type: RoleType;
  createdAt: Date;
  updatedAt: Date;
  permissions: Array<{
    id: string;
    resource: string;
    action: string;
  }>;
};

export class RoleMapper {
  static toDomain(kyselyRole: KyselyRole): Role {
    return {
      id: kyselyRole.id,
      name: kyselyRole.name,
      description: kyselyRole.description || undefined,
      color: kyselyRole.color || undefined,
      teamId: kyselyRole.teamId || undefined,
      type: kyselyRole.type as DomainRoleType,
      permissions: kyselyRole.permissions.map((p) => ({
        id: p.id,
        resource: p.resource,
        action: p.action,
      })),
      createdAt: kyselyRole.createdAt,
      updatedAt: kyselyRole.updatedAt,
    };
  }

  static toKysely(role: Role): Omit<KyselyRole, "permissions"> {
    return {
      id: role.id,
      name: role.name,
      description: role.description || null,
      color: role.color || null,
      teamId: role.teamId || null,
      type: role.type as DomainRoleType,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  static permissionToKysely(roleId: string, permission: RolePermission) {
    return {
      roleId,
      resource: permission.resource,
      action: permission.action,
    };
  }
}

import { RoleOutput } from "@/modules/organizations/roles/outputs/role.output";
import { Injectable } from "@nestjs/common";

import type { Role } from "@calcom/platform-libraries/pbac";

@Injectable()
export class OrganizationsRolesOutputService {
  getRoleOutput(role: Role): RoleOutput {
    return {
      id: role.id,
      name: role.name,
      color: role.color || null,
      description: role.description || null,
      teamId: role.teamId || null,
      type: role.type,
      permissions: role.permissions.map((permission) => `${permission.resource}.${permission.action}`),
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }

  getRolesOutput(roles: Role[]): RoleOutput[] {
    return roles.map((role) => this.getRoleOutput(role));
  }
}

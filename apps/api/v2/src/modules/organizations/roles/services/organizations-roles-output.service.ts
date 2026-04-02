import type { Role } from "@calcom/platform-libraries/pbac";
import { Injectable } from "@nestjs/common";
import { OrgRoleOutput } from "@/modules/organizations/roles/outputs/org-role.output";
import { TeamRoleOutput } from "@/modules/organizations/teams/roles/outputs/team-role.output";

@Injectable()
export class OrganizationsRolesOutputService {
  getOrganizationRoleOutput(role: Role): OrgRoleOutput {
    return {
      id: role.id,
      name: role.name,
      color: role.color || null,
      description: role.description || null,
      organizationId: role.teamId || null,
      type: role.type,
      permissions: role.permissions.map((permission) => `${permission.resource}.${permission.action}`),
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }

  getOrganizationRolesOutput(roles: Role[]): TeamRoleOutput[] {
    return roles.map((role) => this.getOrganizationRoleOutput(role));
  }
}

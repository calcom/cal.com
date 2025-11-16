import { TeamRoleOutput } from "@/modules/organizations/teams/roles/outputs/team-role.output";
import { Injectable } from "@nestjs/common";

import type { Role } from "@calcom/platform-libraries/pbac";

@Injectable()
export class TeamRolesOutputService {
  getTeamRoleOutput(role: Role): TeamRoleOutput {
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

  getTeamRolesOutput(roles: Role[]): TeamRoleOutput[] {
    return roles.map((role) => this.getTeamRoleOutput(role));
  }
}

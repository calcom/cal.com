import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";

import { Team } from "@calcom/prisma/client";

@Injectable()
export class IsTeamInOrg implements CanActivate {
  constructor(private organizationsTeamsRepository: OrganizationsTeamsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { team?: Team }>();
    const teamId: string = request.params.teamId;
    const orgId: string = request.params.orgId;

    if (!orgId) {
      throw new ForbiddenException("No org id found in request params.");
    }

    if (!teamId) {
      throw new ForbiddenException("No team id found in request params.");
    }

    const { canAccess, team } = await this.checkIfTeamIsInOrg(orgId, teamId);

    if (canAccess && team) {
      request.team = team;
    }
    return canAccess;
  }

  async checkIfTeamIsInOrg(orgId: string, teamId: string): Promise<{ canAccess: boolean; team?: Team }> {
    const team = await this.organizationsTeamsRepository.findOrgTeam(Number(orgId), Number(teamId));

    if (!team) {
      throw new NotFoundException(`Team (${teamId}) not found.`);
    }

    if (!team.isOrganization && team.parentId === Number(orgId)) {
      return { canAccess: true, team };
    }

    return { canAccess: false };
  }
}

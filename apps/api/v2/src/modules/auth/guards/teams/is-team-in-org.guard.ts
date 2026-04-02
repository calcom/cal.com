import type { Team } from "@calcom/prisma/client";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";

@Injectable()
export class IsTeamInOrg implements CanActivate {
  constructor(private organizationsTeamsRepository: OrganizationsTeamsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { team?: Team }>();
    const teamId: string = request.params.teamId;
    const orgId: string = request.params.orgId;

    if (!orgId) {
      throw new ForbiddenException("IsTeamInOrg - No org id found in request params.");
    }

    if (!teamId) {
      throw new ForbiddenException("IsTeamInOrg - No team id found in request params.");
    }

    const { canAccess, team } = await this.checkIfTeamIsInOrg(orgId, teamId);

    if (!canAccess) {
      throw new ForbiddenException(
        `IsTeamInOrg - Team with id=${teamId} is not part of the organization with id=${orgId}.`
      );
    }

    request.team = team;
    return true;
  }

  async checkIfTeamIsInOrg(orgId: string, teamId: string): Promise<{ canAccess: boolean; team?: Team }> {
    const team = await this.organizationsTeamsRepository.findOrgTeam(Number(orgId), Number(teamId));

    if (!team) {
      throw new NotFoundException(`IsTeamInOrg - Team (${teamId}) not found.`);
    }

    if (!team.isOrganization && team.parentId === Number(orgId)) {
      return { canAccess: true, team };
    }

    return { canAccess: false };
  }
}

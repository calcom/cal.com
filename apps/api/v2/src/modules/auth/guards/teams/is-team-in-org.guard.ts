import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Request } from "express";

import { Team } from "@calcom/prisma/client";

@Injectable()
export class IsTeamInOrg implements CanActivate {
  constructor(private organizationsRepository: OrganizationsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { team: Team }>();
    const teamId: string = request.params.teamId;
    const orgId: string = request.params.orgId;

    if (!orgId) {
      throw new ForbiddenException("No org id found in request params.");
    }

    if (!teamId) {
      throw new ForbiddenException("No team id found in request params.");
    }

    const team = await this.organizationsRepository.findOrgTeam(Number(orgId), Number(teamId));

    if (team && !team.isOrganization && team.parentId === Number(orgId)) {
      request.team = team;
      return true;
    }

    return false;
  }
}

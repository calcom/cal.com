import type { Team } from "@calcom/prisma/client";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Request } from "express";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";

@Injectable()
export class IsUserInOrgTeam implements CanActivate {
  constructor(private organizationsRepository: OrganizationsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { team: Team }>();
    const teamId: string = request.params.teamId;
    const orgId: string = request.params.orgId;
    const userId: string = request.params.userId;

    if (!userId) {
      throw new ForbiddenException("IsUserInOrgTeam - No user id found in request params.");
    }

    if (!orgId) {
      throw new ForbiddenException("IsUserInOrgTeam - No org id found in request params.");
    }

    if (!teamId) {
      throw new ForbiddenException("IsUserInOrgTeam - No team id found in request params.");
    }

    const user = await this.organizationsRepository.findOrgTeamUser(
      Number(orgId),
      Number(teamId),
      Number(userId)
    );

    if (user) {
      request.user = user;
      return true;
    }

    throw new ForbiddenException(
      `IsUserInOrgTeam - user with id=(${userId}) is not part of the team with id=(${teamId}) in the organization with id=(${orgId})`
    );
  }
}

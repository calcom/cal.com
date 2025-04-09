import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";

@Injectable()
export class IsTeamInOrgGuard implements CanActivate {
  constructor(private readonly teamsRepository: TeamsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const orgId = parseInt(request.params.orgId);
    const teamId = parseInt(request.params.teamId);

    if (!orgId || !teamId) {
      return false;
    }

    const team = await this.teamsRepository.getById(teamId);

    if (!team) {
      throw new ForbiddenException("Team not found");
    }

    if (team.parentId !== orgId) {
      throw new ForbiddenException("Team does not belong to this organization");
    }

    return true;
  }
}

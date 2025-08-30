import { TeamsUsersRepository } from "@/modules/teams/users/repositories/teams-users.repository";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class TeamsUsersService {
  constructor(private readonly teamsUsersRepository: TeamsUsersRepository) {}

  async getUsers(teamId: number, emailInput?: string[], skip?: number, take?: number) {
    // Validate team exists
    const team = await this.teamsUsersRepository.getTeamById(teamId);
    if (!team) {
      throw new NotFoundException(`Team with id ${teamId} not found`);
    }

    const emailArray = !emailInput ? [] : emailInput;

    // If team belongs to an organization, get users with organization context
    if (team.parentId && team.parent?.isOrganization) {
      return await this.teamsUsersRepository.getTeamUsersByEmailsWithOrgContext(
        teamId,
        team.parentId,
        emailArray,
        skip,
        take
      );
    }

    // For standalone teams, get users without organization context
    return await this.teamsUsersRepository.getTeamUsersByEmails(teamId, emailArray, skip, take);
  }

  async validateUserTeamAccess(teamId: number, userId: number) {
    const membership = await this.teamsUsersRepository.isUserTeamMember(teamId, userId);
    if (!membership) {
      throw new NotFoundException(`User ${userId} is not a member of team ${teamId}`);
    }
    return membership;
  }
}

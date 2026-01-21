import { TeamService } from "@calcom/platform-libraries";
import { updateNewTeamMemberEventTypes } from "@calcom/platform-libraries/event-types";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { OrganizationMembershipService } from "@/lib/services/organization-membership.service";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { CreateTeamMembershipInput } from "@/modules/teams/memberships/inputs/create-team-membership.input";
import { UpdateTeamMembershipInput } from "@/modules/teams/memberships/inputs/update-team-membership.input";
import { TeamsMembershipsRepository } from "@/modules/teams/memberships/teams-memberships.repository";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { UsersRepository } from "@/modules/users/users.repository";

export const PLATFORM_USER_BEING_ADDED_TO_REGULAR_TEAM_ERROR = `Can't add user to team - the user is platform managed user but team is not because team probably was not created using OAuth credentials.`;
export const REGULAR_USER_BEING_ADDED_TO_PLATFORM_TEAM_ERROR = `Can't add user to team - the user is not platform managed user but team is platform managed. Both have to be created using OAuth credentials.`;
export const PLATFORM_USER_AND_PLATFORM_TEAM_CREATED_WITH_DIFFERENT_OAUTH_CLIENTS_ERROR = `Can't add user to team - managed user and team were created using different OAuth clients.`;

@Injectable()
export class TeamsMembershipsService {
  constructor(
    private readonly teamsMembershipsRepository: TeamsMembershipsRepository,
    private readonly oAuthClientsRepository: OAuthClientRepository,
    private readonly teamsRepository: TeamsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly orgMembershipService: OrganizationMembershipService,
    private readonly logger: Logger
  ) {}

  private async shouldAutoAccept({ teamId, userId }: { teamId: number; userId: number }): Promise<boolean> {
    const team = await this.teamsRepository.getById(teamId);

    if (team?.parentId) {
      const user = await this.usersRepository.findById(userId);
      if (user) {
        const shouldAutoAccept = await this.orgMembershipService.shouldAutoAccept({
          organizationId: team.parentId,
          userEmail: user.email,
        });

        return shouldAutoAccept;
      }
    }

    return false;
  }
  async createTeamMembership(teamId: number, data: CreateTeamMembershipInput) {
    await this.canUserBeAddedToTeam(data.userId, teamId);
    const shouldAutoAccept = await this.shouldAutoAccept({ teamId, userId: data.userId });
    if (shouldAutoAccept) {
      data = { ...data, accepted: true };
    }

    if (data.accepted) {
      try {
        await updateNewTeamMemberEventTypes(data.userId, teamId);
      } catch (err) {
        this.logger.error("Could not update new team member eventTypes", err);
      }
    }
    const teamMembership = await this.teamsMembershipsRepository.createTeamMembership(teamId, data);
    return teamMembership;
  }

  async getPaginatedTeamMemberships(teamId: number, emails?: string[], skip = 0, take = 250) {
    const emailArray = !emails ? [] : emails;

    return await this.teamsMembershipsRepository.findTeamMembershipsPaginatedWithFilters(
      teamId,
      { emails: emailArray },
      skip,
      take
    );
  }

  async getTeamMembership(teamId: number, membershipId: number) {
    const teamMemberships = await this.teamsMembershipsRepository.findTeamMembership(teamId, membershipId);

    if (!teamMemberships) {
      throw new NotFoundException("Organization's Team membership not found");
    }

    return teamMemberships;
  }

  async updateTeamMembership(teamId: number, membershipId: number, data: UpdateTeamMembershipInput) {
    const teamMembership = await this.teamsMembershipsRepository.updateTeamMembershipById(
      teamId,
      membershipId,
      data
    );
    return teamMembership;
  }

  async deleteTeamMembership(teamId: number, membershipId: number) {
    // First get the membership to get the userId
    const teamMembership = await this.teamsMembershipsRepository.findTeamMembership(teamId, membershipId);

    if (!teamMembership) {
      throw new NotFoundException(`Membership with id ${membershipId} not found in team ${teamId}`);
    }

    await TeamService.removeMembers({ teamIds: [teamId], userIds: [teamMembership.userId], isOrg: false });

    return teamMembership;
  }

  async canUserBeAddedToTeam(userId: number, teamId: number) {
    const [userOAuthClient, teamOAuthClient] = await Promise.all([
      this.oAuthClientsRepository.getByUserId(userId),
      this.oAuthClientsRepository.getByTeamId(teamId),
    ]);

    if (!userOAuthClient && !teamOAuthClient) {
      return true;
    }

    if (userOAuthClient && teamOAuthClient && userOAuthClient.id === teamOAuthClient.id) {
      return true;
    }

    if (!teamOAuthClient) {
      throw new BadRequestException(PLATFORM_USER_BEING_ADDED_TO_REGULAR_TEAM_ERROR);
    }

    if (!userOAuthClient) {
      throw new BadRequestException(REGULAR_USER_BEING_ADDED_TO_PLATFORM_TEAM_ERROR);
    }

    throw new BadRequestException(PLATFORM_USER_AND_PLATFORM_TEAM_CREATED_WITH_DIFFERENT_OAUTH_CLIENTS_ERROR);
  }
}

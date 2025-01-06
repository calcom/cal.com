import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { CreateOrgTeamDto } from "@/modules/organizations/inputs/create-organization-team.input";
import { UpdateOrgTeamDto } from "@/modules/organizations/inputs/update-organization-team.input";
import { OrganizationsTeamsRepository } from "@/modules/organizations/repositories/organizations-teams.repository";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class OrganizationsTeamsService {
  private readonly logger = new Logger("OrganizationsTeamsService");

  constructor(
    private readonly organizationsTeamRepository: OrganizationsTeamsRepository,
    private readonly membershipsRepository: MembershipsRepository
  ) {}

  async getPaginatedOrgUserTeams(organizationId: number, userId: number, skip = 0, take = 250) {
    const teams = await this.organizationsTeamRepository.findOrgUserTeamsPaginated(
      organizationId,
      userId,
      skip,
      take
    );
    return teams;
  }

  async getPaginatedOrgTeams(organizationId: number, skip = 0, take = 250) {
    const teams = await this.organizationsTeamRepository.findOrgTeamsPaginated(organizationId, skip, take);
    return teams;
  }

  async deleteOrgTeam(organizationId: number, teamId: number) {
    const team = await this.organizationsTeamRepository.deleteOrgTeam(organizationId, teamId);
    this.logEvent('delete', null, teamId);
    return team;
  }

  async updateOrgTeam(organizationId: number, teamId: number, data: UpdateOrgTeamDto) {
    const team = await this.organizationsTeamRepository.updateOrgTeam(organizationId, teamId, data);
    this.logEvent('update', null, teamId);
    return team;
  }

  async createOrgTeam(organizationId: number, data: CreateOrgTeamDto, user: UserWithProfile) {
    const { autoAcceptCreator, ...rest } = data;

    const team = await this.organizationsTeamRepository.createOrgTeam(organizationId, rest);

    if (user.role !== "ADMIN") {
      await this.membershipsRepository.createMembership(team.id, user.id, "OWNER", !!autoAcceptCreator);
    }
    this.logEvent('create', user, team.id);
    return team;
  }

  async createPlatformOrgTeam(
    organizationId: number,
    oAuthClientId: string,
    data: CreateOrgTeamDto,
    user: UserWithProfile
  ) {
    const { autoAcceptCreator, ...rest } = data;

    const team = await this.organizationsTeamRepository.createPlatformOrgTeam(
      organizationId,
      oAuthClientId,
      rest
    );

    if (user.role !== "ADMIN") {
      await this.membershipsRepository.createMembership(team.id, user.id, "OWNER", !!autoAcceptCreator);
    }
    this.logEvent('create', user, team.id);
    return team;
  }

  private logEvent(action: string, user: UserWithProfile | null, teamId: number) {
    const userId = user ? user.id : 'system';
    this.logger.log(`User ${userId} performed ${action} action on team ${teamId}`);
  }
}

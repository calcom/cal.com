import { Injectable } from "@nestjs/common";
import { MembershipsRepository } from "src/modules/memberships/memberships.repository";
import { CreateOrgTeamDto } from "src/modules/organizations/inputs/create-organization-team.input";
import { UpdateOrgTeamDto } from "src/modules/organizations/inputs/update-organization-team.input";
import { OrganizationsTeamsRepository } from "src/modules/organizations/repositories/organizations-teams.repository";
import { UserWithProfile } from "src/modules/users/users.repository";

import { updateNewTeamMemberEventTypes } from "@calcom/platform-libraries";

@Injectable()
export class OrganizationsTeamsService {
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
    return team;
  }

  async updateOrgTeam(organizationId: number, teamId: number, data: UpdateOrgTeamDto) {
    const team = await this.organizationsTeamRepository.updateOrgTeam(organizationId, teamId, data);
    return team;
  }

  async createOrgTeam(organizationId: number, data: CreateOrgTeamDto, user: UserWithProfile) {
    const { autoAcceptCreator, ...rest } = data;

    const team = await this.organizationsTeamRepository.createOrgTeam(organizationId, rest);

    if (user.role !== "ADMIN") {
      await this.membershipsRepository.createMembership(team.id, user.id, "OWNER", !!autoAcceptCreator);
    }
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
    return team;
  }

  async addUserToTeamEvents(userId: number, organizationId: number) {
    const orgTeams = await this.organizationsTeamRepository.findOrgTeams(organizationId);

    for (const team of orgTeams) {
      await updateNewTeamMemberEventTypes(userId, team.id);
    }
  }

  async addUserToPlatformTeamEvents(userId: number, organizationId: number, oAuthClientId: string) {
    const oAuthClientTeams = await this.organizationsTeamRepository.getPlatformOrgTeams(
      organizationId,
      oAuthClientId
    );

    for (const team of oAuthClientTeams) {
      await updateNewTeamMemberEventTypes(userId, team.id);
    }
  }
}

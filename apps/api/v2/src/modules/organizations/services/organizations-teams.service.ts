import { CreateOrgTeamDto } from "@/modules/organizations/inputs/create-organization-team.input";
import { OrganizationsTeamsRepository } from "@/modules/organizations/repositories/organizations-teams.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsTeamsService {
  constructor(private readonly organizationsTeamRepository: OrganizationsTeamsRepository) {}

  async getPaginatedOrgTeams(organizationId: number, skip = 0, take = 250) {
    const teams = await this.organizationsTeamRepository.findOrgTeamsPaginated(organizationId, skip, take);
    return teams;
  }

  async deleteOrgTeam(organizationId: number, teamId: number) {
    const team = await this.organizationsTeamRepository.deleteOrgTeam(organizationId, teamId);
    return team;
  }

  async updateOrgTeam(organizationId: number, teamId: number, data: CreateOrgTeamDto) {
    const team = await this.organizationsTeamRepository.updateOrgTeam(organizationId, teamId, data);
    return team;
  }

  async createOrgTeam(organizationId: number, data: CreateOrgTeamDto) {
    const team = await this.organizationsTeamRepository.createOrgTeam(organizationId, data);
    return team;
  }
}

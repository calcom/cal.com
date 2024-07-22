import { CreateOrgTeamMembershipDto } from "@/modules/organizations/inputs/create-organization-team-membership.input";
import { UpdateOrgTeamMembershipDto } from "@/modules/organizations/inputs/update-organization-team-membership.input";
import { OrganizationsTeamsMembershipsRepository } from "@/modules/organizations/repositories/organizations-teams-memberships.repository";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class OrganizationsTeamsMembershipsService {
  constructor(
    private readonly organizationsTeamsMembershipsRepository: OrganizationsTeamsMembershipsRepository
  ) {}

  async createOrgTeamMembership(teamId: number, data: CreateOrgTeamMembershipDto) {
    const teamMembership = await this.organizationsTeamsMembershipsRepository.createOrgTeamMembership(
      teamId,
      data
    );
    return teamMembership;
  }

  async getPaginatedOrgTeamMemberships(organizationId: number, teamId: number, skip = 0, take = 250) {
    const teamMemberships =
      await this.organizationsTeamsMembershipsRepository.findOrgTeamMembershipsPaginated(
        organizationId,
        teamId,
        skip,
        take
      );
    return teamMemberships;
  }

  async getOrgTeamMembership(organizationId: number, teamId: number, membershipId: number) {
    const teamMemberships = await this.organizationsTeamsMembershipsRepository.findOrgTeamMembership(
      organizationId,
      teamId,
      membershipId
    );

    if (!teamMemberships) {
      throw new NotFoundException("Organization's Team membership not found");
    }

    return teamMemberships;
  }

  async updateOrgTeamMembership(
    organizationId: number,
    teamId: number,
    membershipId: number,
    data: UpdateOrgTeamMembershipDto
  ) {
    const teamMembership = await this.organizationsTeamsMembershipsRepository.updateOrgTeamMembershipById(
      organizationId,
      teamId,
      membershipId,
      data
    );
    return teamMembership;
  }

  async deleteOrgTeamMembership(organizationId: number, teamId: number, membershipId: number) {
    const teamMembership = await this.organizationsTeamsMembershipsRepository.deleteOrgTeamMembershipById(
      organizationId,
      teamId,
      membershipId
    );
    return teamMembership;
  }
}

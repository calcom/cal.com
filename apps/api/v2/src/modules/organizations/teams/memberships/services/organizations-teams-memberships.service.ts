import { TeamService } from "@calcom/platform-libraries";
import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateOrgTeamMembershipDto } from "@/modules/organizations/teams/memberships/inputs/create-organization-team-membership.input";
import { UpdateOrgTeamMembershipDto } from "@/modules/organizations/teams/memberships/inputs/update-organization-team-membership.input";
import { OrganizationsTeamsMembershipsRepository } from "@/modules/organizations/teams/memberships/organizations-teams-memberships.repository";
import { TeamsMembershipsService } from "@/modules/teams/memberships/services/teams-memberships.service";

@Injectable()
export class OrganizationsTeamsMembershipsService {
  constructor(
    private readonly organizationsTeamsMembershipsRepository: OrganizationsTeamsMembershipsRepository,
    private readonly teamsMembershipsService: TeamsMembershipsService
  ) {}

  async createOrgTeamMembership(teamId: number, data: CreateOrgTeamMembershipDto) {
    await this.teamsMembershipsService.canUserBeAddedToTeam(data.userId, teamId);
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
    // First get the membership to get the userId
    const teamMembership = await this.organizationsTeamsMembershipsRepository.findOrgTeamMembership(
      organizationId,
      teamId,
      membershipId
    );

    if (!teamMembership) {
      throw new NotFoundException(
        `Membership with id ${membershipId} not found in team ${teamId} of organization ${organizationId}`
      );
    }

    await TeamService.removeMembers({ teamIds: [teamId], userIds: [teamMembership.userId], isOrg: false });

    return teamMembership;
  }
}

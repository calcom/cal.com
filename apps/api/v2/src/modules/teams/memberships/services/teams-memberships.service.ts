import { CreateTeamMembershipInput } from "@/modules/teams/memberships/inputs/create-team-membership.input";
import { UpdateTeamMembershipInput } from "@/modules/teams/memberships/inputs/update-team-membership.input";
import { TeamsMembershipsRepository } from "@/modules/teams/memberships/teams-memberships.repository";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class TeamsMembershipsService {
  constructor(private readonly teamsMembershipsRepository: TeamsMembershipsRepository) {}

  async createTeamMembership(teamId: number, data: CreateTeamMembershipInput) {
    const teamMembership = await this.teamsMembershipsRepository.createTeamMembership(teamId, data);
    return teamMembership;
  }

  async getPaginatedTeamMemberships(teamId: number, skip = 0, take = 250) {
    const teamMemberships = await this.teamsMembershipsRepository.findTeamMembershipsPaginated(
      teamId,
      skip,
      take
    );
    return teamMemberships;
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
    const teamMembership = await this.teamsMembershipsRepository.deleteTeamMembershipById(
      teamId,
      membershipId
    );
    return teamMembership;
  }
}

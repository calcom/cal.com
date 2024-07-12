import { CreateOrgMembershipDto } from "@/modules/organizations/inputs/create-organization-membership.input";
import { OrganizationsMembershipRepository } from "@/modules/organizations/repositories/organizations-membership.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/repositories/organizations-teams.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsMembershipService {
  constructor(
    private readonly organizationsMembershipRepository: OrganizationsMembershipRepository,
    private readonly organizationsTeamsRepository: OrganizationsTeamsRepository
  ) {}

  async getOrgMembership(organizationId: number, membershipId: number) {
    const membership = await this.organizationsMembershipRepository.findOrgMembership(
      organizationId,
      membershipId
    );
    return membership;
  }

  async getPaginatedOrgMemberships(organizationId: number, skip = 0, take = 250) {
    const organizationTeamsIds = await this.organizationsTeamsRepository.findOrgTeams(organizationId);
    const memberships = await this.organizationsMembershipRepository.findOrgMembershipsPaginated(
      organizationTeamsIds,
      skip,
      take
    );
    return memberships;
  }

  async deleteOrgMembership(organizationId: number, membershipId: number) {
    const memberships = await this.organizationsMembershipRepository.deleteOrgMembership(
      organizationId,
      membershipId
    );
    return memberships;
  }

  async updateOrgMembership(organizationId: number, membershipId: number, data: CreateOrgMembershipDto) {
    const membership = await this.organizationsMembershipRepository.updateOrgMembership(
      organizationId,
      membershipId,
      data
    );
    return membership;
  }

  async createOrgMembership(organizationId: number, data: CreateOrgMembershipDto) {
    const membership = await this.organizationsMembershipRepository.createOrgMembership(organizationId, data);
    return membership;
  }
}

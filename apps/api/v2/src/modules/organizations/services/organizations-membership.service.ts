import { CreateOrgMembershipDto } from "@/modules/organizations/inputs/create-organization-membership.input";
import { OrganizationsMembershipRepository } from "@/modules/organizations/repositories/organizations-membership.repository";
import { Injectable } from "@nestjs/common";

import { UpdateOrgMembershipDto } from "../inputs/update-organization-membership.input";

@Injectable()
export class OrganizationsMembershipService {
  constructor(private readonly organizationsMembershipRepository: OrganizationsMembershipRepository) {}

  async getOrgMembership(organizationId: number, membershipId: number) {
    const membership = await this.organizationsMembershipRepository.findOrgMembership(
      organizationId,
      membershipId
    );
    return membership;
  }

  async getPaginatedOrgMemberships(organizationId: number, skip = 0, take = 250) {
    const memberships = await this.organizationsMembershipRepository.findOrgMembershipsPaginated(
      organizationId,
      skip,
      take
    );
    return memberships;
  }

  async deleteOrgMembership(organizationId: number, membershipId: number) {
    const membership = await this.organizationsMembershipRepository.deleteOrgMembership(
      organizationId,
      membershipId
    );
    return membership;
  }

  async updateOrgMembership(organizationId: number, membershipId: number, data: UpdateOrgMembershipDto) {
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

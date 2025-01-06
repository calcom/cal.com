import { CreateOrgMembershipDto } from "@/modules/organizations/inputs/create-organization-membership.input";
import { OrganizationsMembershipRepository } from "@/modules/organizations/repositories/organizations-membership.repository";
import { Injectable, Logger } from "@nestjs/common";

import { UpdateOrgMembershipDto } from "../inputs/update-organization-membership.input";

@Injectable()
export class OrganizationsMembershipService {
  private readonly logger = new Logger("OrganizationsMembershipService");

  constructor(private readonly organizationsMembershipRepository: OrganizationsMembershipRepository) {}

  async getOrgMembership(organizationId: number, membershipId: number) {
    const membership = await this.organizationsMembershipRepository.findOrgMembership(
      organizationId,
      membershipId
    );
    return membership;
  }

  async getOrgMembershipByUserId(organizationId: number, userId: number) {
    const membership = await this.organizationsMembershipRepository.findOrgMembershipByUserId(
      organizationId,
      userId
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
    this.logEvent('delete', membershipId, organizationId);
    return membership;
  }

  async updateOrgMembership(organizationId: number, membershipId: number, data: UpdateOrgMembershipDto) {
    const membership = await this.organizationsMembershipRepository.updateOrgMembership(
      organizationId,
      membershipId,
      data
    );
    this.logEvent('update', membershipId, organizationId);
    return membership;
  }

  async createOrgMembership(organizationId: number, data: CreateOrgMembershipDto) {
    const membership = await this.organizationsMembershipRepository.createOrgMembership(organizationId, data);
    this.logEvent('create', membership.id, organizationId);
    return membership;
  }

  private logEvent(action: string, membershipId: number, organizationId: number) {
    this.logger.log(`Performed ${action} action on membership ${membershipId} in organization ${organizationId}`);
  }
}

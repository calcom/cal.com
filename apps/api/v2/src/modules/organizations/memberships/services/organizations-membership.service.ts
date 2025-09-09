import { CreateOrgMembershipDto } from "@/modules/organizations/memberships/inputs/create-organization-membership.input";
import { OrganizationsMembershipRepository } from "@/modules/organizations/memberships/organizations-membership.repository";
import { Injectable, NotFoundException } from "@nestjs/common";

import { TeamService } from "@calcom/platform-libraries";

import { UpdateOrgMembershipDto } from "../inputs/update-organization-membership.input";
import { OrganizationsMembershipOutputService } from "./organizations-membership-output.service";

@Injectable()
export class OrganizationsMembershipService {
  constructor(
    private readonly organizationsMembershipRepository: OrganizationsMembershipRepository,
    private readonly organizationsMembershipOutputService: OrganizationsMembershipOutputService
  ) {}

  async getOrgMembership(organizationId: number, membershipId: number) {
    const membership = await this.organizationsMembershipRepository.findOrgMembership(
      organizationId,
      membershipId
    );

    if (!membership) {
      throw new NotFoundException(
        `Membership with id ${membershipId} within organization id ${organizationId} not found`
      );
    }

    return this.organizationsMembershipOutputService.getOrgMembershipOutput(membership);
  }

  async isOrgAdminOrOwner(organizationId: number, userId: number) {
    const membership = await this.organizationsMembershipRepository.findOrgMembershipByUserId(
      organizationId,
      userId
    );
    if (!membership) {
      return false;
    }
    return membership.role === "ADMIN" || membership.role === "OWNER";
  }

  async getOrgMembershipByUserId(organizationId: number, userId: number) {
    const membership = await this.organizationsMembershipRepository.findOrgMembershipByUserId(
      organizationId,
      userId
    );
    if (!membership) {
      throw new NotFoundException(
        `Membership for user with id ${userId} within organization id ${organizationId} not found`
      );
    }

    return this.organizationsMembershipOutputService.getOrgMembershipOutput(membership);
  }

  async getPaginatedOrgMemberships(organizationId: number, skip = 0, take = 250) {
    const memberships = await this.organizationsMembershipRepository.findOrgMembershipsPaginated(
      organizationId,
      skip,
      take
    );
    return this.organizationsMembershipOutputService.getOrgMembershipsOutput(memberships);
  }

  async deleteOrgMembership(organizationId: number, membershipId: number) {
    // Get the membership first to get the userId
    const membership = await this.organizationsMembershipRepository.findOrgMembership(
      organizationId,
      membershipId
    );

    if (!membership) {
      throw new NotFoundException(
        `Membership with id ${membershipId} within organization id ${organizationId} not found`
      );
    }

    await TeamService.removeMembers({
      teamIds: [organizationId],
      userIds: [membership.userId],
      isOrg: true,
    });

    return this.organizationsMembershipOutputService.getOrgMembershipOutput(membership);
  }

  async updateOrgMembership(organizationId: number, membershipId: number, data: UpdateOrgMembershipDto) {
    const membership = await this.organizationsMembershipRepository.updateOrgMembership(
      organizationId,
      membershipId,
      data
    );
    return this.organizationsMembershipOutputService.getOrgMembershipOutput(membership);
  }

  async createOrgMembership(organizationId: number, data: CreateOrgMembershipDto) {
    const membership = await this.organizationsMembershipRepository.createOrgMembership(organizationId, data);
    return this.organizationsMembershipOutputService.getOrgMembershipOutput(membership);
  }
}

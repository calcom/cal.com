import { CreateOrgMembershipDto } from "@/modules/organizations/memberships/inputs/create-organization-membership.input";
import { OrganizationsMembershipRepository } from "@/modules/organizations/memberships/organizations-membership.repository";
import { ProfilesRepository } from "@/modules/profiles/profiles.repository";
import { Injectable, NotFoundException } from "@nestjs/common";

import { UpdateOrgMembershipDto } from "../inputs/update-organization-membership.input";
import { OrganizationsMembershipOutputService } from "./organizations-membership-output.service";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";

@Injectable()
export class OrganizationsMembershipService {
  constructor(
    private readonly organizationsMembershipRepository: OrganizationsMembershipRepository,
    private readonly organizationsMembershipOutputService: OrganizationsMembershipOutputService,
    private readonly teamsEventTypesRepository: TeamsEventTypesRepository,
    private readonly profilesRepository: ProfilesRepository
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
    const membership = await this.organizationsMembershipRepository.deleteOrgMembership(
      organizationId,
      membershipId
    );
    // Delete user's memberships from all sub-teams
    await this.organizationsMembershipRepository.deleteUserSubTeamMemberships(membership.userId, organizationId);
    // Delete user's managed child events in sub-teams
    await this.teamsEventTypesRepository.deleteUserManagedSubTeamsEventTypes(membership.userId, organizationId);
    // Remove user from hosts of sub-team event types
    await this.teamsEventTypesRepository.removeUserFromSubTeamsEventTypesHosts(membership.userId, organizationId);
    // Delete user's profile
    await this.profilesRepository.deleteProfile(membership.userId, organizationId);
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

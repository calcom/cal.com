import { TeamService } from "@calcom/platform-libraries";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { UpdateOrgMembershipDto } from "../inputs/update-organization-membership.input";
import { OrganizationsMembershipOutputService } from "./organizations-membership-output.service";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OrganizationsDelegationCredentialService } from "@/modules/organizations/delegation-credentials/services/organizations-delegation-credential.service";
import { CreateOrgMembershipDto } from "@/modules/organizations/memberships/inputs/create-organization-membership.input";
import { OrganizationsMembershipRepository } from "@/modules/organizations/memberships/organizations-membership.repository";
import { OrganizationMembershipOutput } from "@/modules/organizations/memberships/outputs/organization-membership.output";

export const PLATFORM_USER_BEING_ADDED_TO_REGULAR_ORG_ERROR = `Can't add user to organization - the user is platform managed user but organization is not because organization probably was not created using OAuth credentials.`;
export const REGULAR_USER_BEING_ADDED_TO_PLATFORM_ORG_ERROR = `Can't add user to organization - the user is not platform managed user but organization is platform managed. Both have to be created using OAuth credentials.`;
export const MANAGED_USER_AND_MANAGED_ORG_CREATED_WITH_DIFFERENT_OAUTH_CLIENTS_ERROR = `Can't add user to organization - managed user and organization were created using different OAuth clients.`;

@Injectable()
export class OrganizationsMembershipService {
  constructor(
    private readonly organizationsMembershipRepository: OrganizationsMembershipRepository,
    private readonly organizationsMembershipOutputService: OrganizationsMembershipOutputService,
    private readonly oAuthClientsRepository: OAuthClientRepository,
    private readonly delegationCredentialService: OrganizationsDelegationCredentialService
  ) {}

  async getOrgMembership(
    organizationId: number,
    membershipId: number
  ): Promise<OrganizationMembershipOutput> {
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

  async isOrgAdminOrOwner(organizationId: number, userId: number): Promise<boolean> {
    const membership = await this.organizationsMembershipRepository.findOrgMembershipByUserId(
      organizationId,
      userId
    );
    if (!membership) {
      return false;
    }
    return membership.role === "ADMIN" || membership.role === "OWNER";
  }

  async getOrgMembershipByUserId(
    organizationId: number,
    userId: number
  ): Promise<OrganizationMembershipOutput> {
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

  async getPaginatedOrgMemberships(
    organizationId: number,
    skip = 0,
    take = 250
  ): Promise<OrganizationMembershipOutput[]> {
    const memberships = await this.organizationsMembershipRepository.findOrgMembershipsPaginated(
      organizationId,
      skip,
      take
    );
    return this.organizationsMembershipOutputService.getOrgMembershipsOutput(memberships);
  }

  async deleteOrgMembership(
    organizationId: number,
    membershipId: number
  ): Promise<OrganizationMembershipOutput> {
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

  async updateOrgMembership(
    organizationId: number,
    membershipId: number,
    data: UpdateOrgMembershipDto
  ): Promise<OrganizationMembershipOutput> {
    const membership = await this.organizationsMembershipRepository.updateOrgMembership(
      organizationId,
      membershipId,
      data
    );
    return this.organizationsMembershipOutputService.getOrgMembershipOutput(membership);
  }

  async createOrgMembership(
    organizationId: number,
    data: CreateOrgMembershipDto
  ): Promise<OrganizationMembershipOutput> {
    await this.canUserBeAddedToOrg(data.userId, organizationId);
    const membership = await this.organizationsMembershipRepository.createOrgMembership(organizationId, data);

    if (membership.user.email) {
      await this.delegationCredentialService.ensureDefaultCalendarsForUser(
        organizationId,
        data.userId,
        membership.user.email
      );
    }

    return this.organizationsMembershipOutputService.getOrgMembershipOutput(membership);
  }

  async canUserBeAddedToOrg(userId: number, orgId: number): Promise<boolean> {
    const [userOAuthClient, orgOAuthClients] = await Promise.all([
      this.oAuthClientsRepository.getByUserId(userId),
      this.oAuthClientsRepository.getByOrgId(orgId),
    ]);

    if (!userOAuthClient && orgOAuthClients.length === 0) {
      return true;
    }

    if (userOAuthClient && orgOAuthClients.some((orgClient) => orgClient.id === userOAuthClient.id)) {
      return true;
    }

    if (!userOAuthClient) {
      throw new BadRequestException(REGULAR_USER_BEING_ADDED_TO_PLATFORM_ORG_ERROR);
    }

    if (orgOAuthClients.length === 0) {
      throw new BadRequestException(PLATFORM_USER_BEING_ADDED_TO_REGULAR_ORG_ERROR);
    }

    throw new BadRequestException(MANAGED_USER_AND_MANAGED_ORG_CREATED_WITH_DIFFERENT_OAUTH_CLIENTS_ERROR);
  }
}

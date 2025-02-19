import { ManagedOrganizationsBillingService } from "@/modules/billing/services/managed-organizations.billing.service";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsMembershipService } from "@/modules/organizations/memberships/services/organizations-membership.service";
import { CreateOrganizationInput } from "@/modules/organizations/organizations/inputs/create-organization.input";
import { UpdateOrganizationInput } from "@/modules/organizations/organizations/inputs/update-organization.input";
import { ManagedOrganizationsRepository } from "@/modules/organizations/organizations/managed-organizations.repository";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DateTime } from "luxon";

import { createApiKeyHandler } from "@calcom/platform-libraries";

@Injectable()
export class ManagedOrganizationsService {
  constructor(
    private readonly managedOrganizationsRepository: ManagedOrganizationsRepository,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly managedOrganizationsBillingService: ManagedOrganizationsBillingService,
    private readonly organizationsMembershipService: OrganizationsMembershipService
  ) {}

  async createManagedOrganization(
    authUserId: number,
    managerOrganizationId: number,
    organizationInput: CreateOrganizationInput
  ) {
    const isManagerOrganizationPlatform = await this.isManagerOrganizationPlatform(managerOrganizationId);
    if (!isManagerOrganizationPlatform) {
      throw new ForbiddenException(
        "Manager organization must be a platform organization. Normal organizations can't create managed organizations yet."
      );
    }

    const isOrganization = true;
    const isPlatform = true;
    const organization = await this.managedOrganizationsRepository.createManagedOrganization(
      managerOrganizationId,
      { ...organizationInput, isOrganization, isPlatform }
    );

    await this.organizationsMembershipService.createOrgMembership(organization.id, {
      userId: authUserId,
      accepted: true,
      role: "OWNER",
    });

    await this.managedOrganizationsBillingService.createManagedOrganizationBilling(
      managerOrganizationId,
      organization.id
    );

    if (organizationInput.apiKeyDaysValid && organizationInput.apiKeyNeverExpires) {
      throw new BadRequestException(
        "Cannot set both apiKeyDaysValid and apiKeyNeverExpires in the request body."
      );
    }

    const apiKeyExpiresAfterDays = organizationInput.apiKeyDaysValid ? organizationInput.apiKeyDaysValid : 30;
    const apiKeyExpiresAt = DateTime.utc().plus({ days: apiKeyExpiresAfterDays }).toJSDate();
    const apiKey = await createApiKeyHandler({
      ctx: {
        user: {
          id: authUserId,
        },
      },
      input: {
        note: `Managed organization API key. ManagerOrgId: ${managerOrganizationId}. ManagedOrgId: ${organization.id}`,
        neverExpires: !!organizationInput.apiKeyNeverExpires,
        expiresAt: apiKeyExpiresAt,
        teamId: organization.id,
      },
    });

    return {
      ...organization,
      apiKey,
    };
  }

  private async isManagerOrganizationPlatform(managerOrganizationId: number) {
    const organization = await this.organizationsRepository.findById(managerOrganizationId);
    return !!organization?.isPlatform;
  }

  async getManagedOrganization(managedOrganizationId: number) {
    const organization = await this.organizationsRepository.findById(managedOrganizationId);
    if (!organization) {
      throw new NotFoundException(`Managed organization with id=${managedOrganizationId} does not exist.`);
    }
    return organization;
  }

  async getManagedOrganizations(managerOrganizationId: number) {
    const managedOrganizations = await this.managedOrganizationsRepository.getByManagerOrganizationId(
      managerOrganizationId
    );
    const managedOrganizationsIds = managedOrganizations.map(
      (managedOrganization) => managedOrganization.managedOrganizationId
    );

    return await this.organizationsRepository.findByIds(managedOrganizationsIds);
  }

  async updateManagedOrganization(managedOrganizationId: number, body: UpdateOrganizationInput) {
    return await this.organizationsRepository.update(managedOrganizationId, body);
  }

  async deleteManagedOrganization(managedOrganizationId: number) {
    return await this.organizationsRepository.delete(managedOrganizationId);
  }
}

import { ManagedOrganizationsBillingService } from "@/modules/billing/services/managed-organizations.billing.service";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsMembershipService } from "@/modules/organizations/memberships/services/organizations-membership.service";
import { CreateOrganizationInput } from "@/modules/organizations/organizations/inputs/create-organization.input";
import { ManagedOrganizationsRepository } from "@/modules/organizations/organizations/managed-organizations.repository";
import { ForbiddenException, Injectable } from "@nestjs/common";

import { createApiKeyHandler } from "@calcom/platform-libraries";

@Injectable()
export class ManagedOrganizationsService {
  constructor(
    private readonly managedOrganizationsRepository: ManagedOrganizationsRepository,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly managedOrganizationsBillingService: ManagedOrganizationsBillingService
  ) {}

  async createManagedOrganization(
    authUserId: number,
    managerOrganizationId: number,
    organizationInpit: CreateOrganizationInput
  ) {
    const isManagerOrganizationPlatform = await this.isManagerOrganizationPlatform(managerOrganizationId);
    if (!isManagerOrganizationPlatform) {
      throw new ForbiddenException(
        "Manager organization must be a platform organization. Normal organizations can't create managed organizations yet."
      );
    }

    const organization = await this.managedOrganizationsRepository.createManagedOrganization(
      managerOrganizationId,
      organizationInpit
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

    const apiKey = await createApiKeyHandler({
      ctx: {
        user: {
          id: authUserId,
        },
      },
      input: {
        note: `Managed organization API key. ManagerOrgId: ${managerOrganizationId}. ManagedOrgId: ${organization.id}`,
        neverExpires: true,
        teamId: organization.id,
      },
    });

    return {
      ...organization,
      apiKey,
    };
  }

  async isManagerOrganizationPlatform(managerOrganizationId: number) {
    const organization = await this.organizationsRepository.findById(managerOrganizationId);
    return !!organization?.isPlatform;
  }
}

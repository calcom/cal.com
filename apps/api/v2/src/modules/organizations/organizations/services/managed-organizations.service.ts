import { getPagination } from "@/lib/pagination/pagination";
import { ApiKeysService } from "@/modules/api-keys/services/api-keys.service";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { ManagedOrganizationsBillingService } from "@/modules/billing/services/managed-organizations.billing.service";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsMembershipService } from "@/modules/organizations/memberships/services/organizations-membership.service";
import { CreateOrganizationInput } from "@/modules/organizations/organizations/inputs/create-managed-organization.input";
import { GetManagedOrganizationsInput_2024_08_13 } from "@/modules/organizations/organizations/inputs/get-managed-organizations.input";
import { UpdateOrganizationInput } from "@/modules/organizations/organizations/inputs/update-managed-organization.input";
import { ManagedOrganizationsRepository } from "@/modules/organizations/organizations/managed-organizations.repository";
import { ManagedOrganizationsOutputService } from "@/modules/organizations/organizations/services/managed-organizations-output.service";
import { ProfilesRepository } from "@/modules/profiles/profiles.repository";
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { slugify } from "@calcom/platform-libraries";

@Injectable()
export class ManagedOrganizationsService {
  constructor(
    private readonly managedOrganizationsRepository: ManagedOrganizationsRepository,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly managedOrganizationsBillingService: ManagedOrganizationsBillingService,
    private readonly organizationsMembershipService: OrganizationsMembershipService,
    private readonly apiKeysService: ApiKeysService,
    private readonly managedOrganizationsOutputService: ManagedOrganizationsOutputService,
    private readonly profilesRepository: ProfilesRepository
  ) {}

  async createManagedOrganization(
    authUser: ApiAuthGuardUser,
    managerOrganizationId: number,
    organizationInput: CreateOrganizationInput
  ) {
    const isManagerOrganizationPlatform = await this.isManagerOrganizationPlatform(managerOrganizationId);
    if (!isManagerOrganizationPlatform) {
      throw new ForbiddenException(
        "Manager organization must be a platform organization. Normal organizations can't create managed organizations yet."
      );
    }

    const { apiKeyDaysValid, apiKeyNeverExpires, ...organizationData } = organizationInput;

    const effectiveSlug = organizationData.slug || slugify(organizationData.name);

    if (!organizationData.slug) {
      organizationData.slug = effectiveSlug;
    }

    const existingManagedOrganization =
      await this.managedOrganizationsRepository.getManagedOrganizationBySlug(
        managerOrganizationId,
        effectiveSlug
      );

    if (existingManagedOrganization) {
      throw new ConflictException(
        `Organization with slug '${organizationData.slug}' already exists. Please, either provide a different slug or change name so that the automatically generated slug is different.`
      );
    }

    const organization = await this.managedOrganizationsRepository.createManagedOrganization(
      managerOrganizationId,
      {
        ...organizationData,
        isOrganization: true,
        isPlatform: true,
        metadata: organizationData.metadata,
      }
    );

    await this.organizationsMembershipService.createOrgMembership(organization.id, {
      userId: authUser.id,
      accepted: true,
      role: "OWNER",
    });

    const defaultProfileUsername = `${organization.name}-${authUser.id}`;
    await this.profilesRepository.createProfile(
      organization.id,
      authUser.id,
      authUser.username || defaultProfileUsername
    );

    await this.managedOrganizationsBillingService.createManagedOrganizationBilling(
      managerOrganizationId,
      organization.id
    );

    const apiKey = await this.apiKeysService.createApiKey(authUser.id, {
      apiKeyDaysValid,
      apiKeyNeverExpires,
      note: `Managed organization API key. ManagerOrgId: ${managerOrganizationId}. ManagedOrgId: ${organization.id}`,
      teamId: organization.id,
    });

    const outputOrganization =
      this.managedOrganizationsOutputService.getOutputManagedOrganization(organization);

    return {
      ...outputOrganization,
      apiKey,
    };
  }

  private async isManagerOrganizationPlatform(managerOrganizationId: number) {
    const organization = await this.organizationsRepository.findById({ id: managerOrganizationId });
    return !!organization?.isPlatform;
  }

  async getManagedOrganization(managedOrganizationId: number) {
    const organization = await this.organizationsRepository.findById({ id: managedOrganizationId });
    if (!organization) {
      throw new NotFoundException(`Managed organization with id=${managedOrganizationId} does not exist.`);
    }
    return this.managedOrganizationsOutputService.getOutputManagedOrganization(organization);
  }

  async getManagedOrganizations(
    managerOrganizationId: number,
    query: GetManagedOrganizationsInput_2024_08_13
  ) {
    const { items: managedOrganizations, totalItems } =
      await this.managedOrganizationsRepository.getByManagerOrganizationIdPaginated(
        managerOrganizationId,
        query
      );

    return {
      organizations: managedOrganizations.map((managedOrganization) =>
        this.managedOrganizationsOutputService.getOutputManagedOrganization(managedOrganization)
      ),
      pagination: getPagination({
        ...query,
        totalCount: totalItems,
      }),
    };
  }

  async updateManagedOrganization(managedOrganizationId: number, body: UpdateOrganizationInput) {
    const organization = await this.organizationsRepository.update(managedOrganizationId, body);
    return this.managedOrganizationsOutputService.getOutputManagedOrganization(organization);
  }

  async deleteManagedOrganization(managedOrganizationId: number) {
    const organization = await this.organizationsRepository.delete(managedOrganizationId);
    return this.managedOrganizationsOutputService.getOutputManagedOrganization(organization);
  }
}

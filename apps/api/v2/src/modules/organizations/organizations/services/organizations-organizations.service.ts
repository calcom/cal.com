import { CreateOrganizationInput } from "@/modules/organizations/organizations/inputs/create-organization.input";
import { ManagedOrganizationsRepository } from "@/modules/organizations/organizations/managed-organizations.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ManagedOrganizationsService {
  constructor(private readonly managedOrganizationsRepository: ManagedOrganizationsRepository) {}

  async createManagedOrganization(managerOrganizationId: number, organizationInpit: CreateOrganizationInput) {
    const organization = await this.managedOrganizationsRepository.createManagedOrganization(
      managerOrganizationId,
      organizationInpit
    );
    // next setup billing
    // next setup api key
  }
}

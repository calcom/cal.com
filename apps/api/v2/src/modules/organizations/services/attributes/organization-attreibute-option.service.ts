import { AssignOrganizationAttributeOptionToUserInput } from "@/modules/organizations/inputs/attributes/assign/organizations-attributes-options-assign.input";
import { CreateOrganizationAttributeOptionInput } from "@/modules/organizations/inputs/attributes/options/create-organization-attribute-option.input";
import { UpdateOrganizationAttributeOptionInput } from "@/modules/organizations/inputs/attributes/options/update-organizaiton-attribute-option.input.ts";
import { OrganizationAttributeOptionRepository } from "@/modules/organizations/repositories/attributes/organization-attribute-option.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationAttributeOptionService {
  constructor(
    private readonly organizationAttributeOptionRepository: OrganizationAttributeOptionRepository
  ) {}

  async createOrganizationAttributeOption(
    organizationId: number,
    attributeId: string,
    data: CreateOrganizationAttributeOptionInput
  ) {
    return this.organizationAttributeOptionRepository.createOrganizationAttributeOption(
      organizationId,
      attributeId,
      data
    );
  }

  async deleteOrganizationAttributeOption(organizationId: number, attributeId: string, optionId: string) {
    return this.organizationAttributeOptionRepository.deleteOrganizationAttributeOption(
      organizationId,
      attributeId,
      optionId
    );
  }

  async updateOrganizationAttributeOption(
    organizationId: number,
    attributeId: string,
    optionId: string,
    data: UpdateOrganizationAttributeOptionInput
  ) {
    return this.organizationAttributeOptionRepository.updateOrganizationAttributeOption(
      organizationId,
      attributeId,
      optionId,
      data
    );
  }

  async getOrganizationAttributeOptions(organizationId: number, attributeId: string) {
    return this.organizationAttributeOptionRepository.getOrganizationAttributeOptions(
      organizationId,
      attributeId
    );
  }

  async assignOrganizationAttributeOptionToUser(
    organizationId: number,
    userId: number,
    data: AssignOrganizationAttributeOptionToUserInput
  ) {
    return this.organizationAttributeOptionRepository.assignOrganizationAttributeOptionToUser(
      organizationId,
      userId,
      data
    );
  }

  async unassignOrganizationAttributeOptionFromUser(
    organizationId: number,
    userId: number,
    attributeOptionId: string
  ) {
    return this.organizationAttributeOptionRepository.unassignOrganizationAttributeOptionFromUser(
      organizationId,
      userId,
      attributeOptionId
    );
  }

  async getOrganizationAttributeOptionsForUser(organizationId: number, userId: number) {
    return this.organizationAttributeOptionRepository.getOrganizationAttributeOptionsForUser(
      organizationId,
      userId
    );
  }
}

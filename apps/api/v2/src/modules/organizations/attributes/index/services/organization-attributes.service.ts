import { CreateOrganizationAttributeInput } from "@/modules/organizations/attributes/index/inputs/create-organization-attribute.input";
import { UpdateOrganizationAttributeInput } from "@/modules/organizations/attributes/index/inputs/update-organization-attribute.input";
import { OrganizationAttributesRepository } from "@/modules/organizations/attributes/index/organization-attributes.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationAttributesService {
  constructor(private readonly organizationAttributesRepository: OrganizationAttributesRepository) {}

  async createOrganizationAttribute(organizationId: number, data: CreateOrganizationAttributeInput) {
    const attribute = await this.organizationAttributesRepository.createOrganizationAttribute(
      organizationId,
      data
    );
    return attribute;
  }

  async getOrganizationAttribute(organizationId: number, attributeId: string) {
    const attribute = await this.organizationAttributesRepository.getOrganizationAttribute(
      organizationId,
      attributeId
    );
    return attribute;
  }

  async getOrganizationAttributes(organizationId: number, skip?: number, take?: number) {
    const attributes = await this.organizationAttributesRepository.getOrganizationAttributes(
      organizationId,
      skip,
      take
    );
    return attributes;
  }

  async updateOrganizationAttribute(
    organizationId: number,
    attributeId: string,
    data: UpdateOrganizationAttributeInput
  ) {
    const attribute = await this.organizationAttributesRepository.updateOrganizationAttribute(
      organizationId,
      attributeId,
      data
    );
    return attribute;
  }

  async deleteOrganizationAttribute(organizationId: number, attributeId: string) {
    const attribute = await this.organizationAttributesRepository.deleteOrganizationAttribute(
      organizationId,
      attributeId
    );
    return attribute;
  }
}

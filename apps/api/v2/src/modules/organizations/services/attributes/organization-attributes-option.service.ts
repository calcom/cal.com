import { AssignOrganizationAttributeOptionToUserInput } from "@/modules/organizations/inputs/attributes/assign/organizations-attributes-options-assign.input";
import { CreateOrganizationAttributeOptionInput } from "@/modules/organizations/inputs/attributes/options/create-organization-attribute-option.input";
import { UpdateOrganizationAttributeOptionInput } from "@/modules/organizations/inputs/attributes/options/update-organizaiton-attribute-option.input.ts";
import { OrganizationAttributeOptionRepository } from "@/modules/organizations/repositories/attributes/organization-attribute-option.repository";
import { OrganizationAttributesService } from "@/modules/organizations/services/attributes/organization-attributes.service";
import { OrganizationsMembershipService } from "@/modules/organizations/services/organizations-membership.service";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";

const TYPE_SUPPORTS_VALUE = new Set(["TEXT", "NUMBER"]);

@Injectable()
export class OrganizationAttributeOptionService {
  private readonly logger = new Logger("OrganizationAttributeOptionService");
  constructor(
    private readonly organizationAttributeOptionRepository: OrganizationAttributeOptionRepository,
    private readonly organizationAttributesService: OrganizationAttributesService,
    private readonly organizationsMembershipsService: OrganizationsMembershipService
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
    const attribute = await this.organizationAttributesService.getOrganizationAttribute(
      organizationId,
      data.attributeId
    );

    if (!attribute) {
      throw new NotFoundException("Attribute not found");
    }

    const membership = await this.organizationsMembershipsService.getOrgMembershipByUserId(
      organizationId,
      userId
    );

    if (!membership || !membership.accepted)
      throw new NotFoundException("User is not a member of the organization");

    if (!TYPE_SUPPORTS_VALUE.has(attribute.type) && data.value) {
      throw new BadRequestException("Attribute type does not support value");
    }

    return this.organizationAttributeOptionRepository.assignOrganizationAttributeOptionToUser({
      organizationId,
      membershipId: membership.id,
      value: data.value,
      attributeId: data.attributeId,
      attributeOptionId: data.attributeOptionId,
    });
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

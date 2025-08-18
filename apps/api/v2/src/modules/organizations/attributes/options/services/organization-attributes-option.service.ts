import { OrganizationAttributesService } from "@/modules/organizations/attributes/index/services/organization-attributes.service";
import { CreateOrganizationAttributeOptionInput } from "@/modules/organizations/attributes/options/inputs/create-organization-attribute-option.input";
import { AssignOrganizationAttributeOptionToUserInput } from "@/modules/organizations/attributes/options/inputs/organizations-attributes-options-assign.input";
import { UpdateOrganizationAttributeOptionInput } from "@/modules/organizations/attributes/options/inputs/update-organizaiton-attribute-option.input.ts";
import { OrganizationAttributeOptionRepository } from "@/modules/organizations/attributes/options/organization-attribute-options.repository";
import { AssignedOptionOutput } from "@/modules/organizations/attributes/options/outputs/assigned-options.output";
import { OrganizationsMembershipService } from "@/modules/organizations/memberships/services/organizations-membership.service";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { plainToClass } from "class-transformer";

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

  async getOrganizationAttributeAssignedOptions({
    organizationId,
    attributeId,
    attributeSlug,
    skip,
    take,
    filters,
  }: GetOrganizationAttributeAssignedOptionsProp) {
    const options = await this.organizationAttributeOptionRepository.getOrganizationAttributeAssignedOptions({
      organizationId,
      ...(attributeId ? { attributeId } : { attributeSlug }),
      skip,
      take,
      filters,
    });
    return options.map((opt) => plainToClass(AssignedOptionOutput, opt, { strategy: "excludeAll" }));
  }
}

// Discriminative Union on attributeSlug / attributeId
export type GetOrganizationAttributeAssignedOptionsProp =
  | GetOrganizationAttributeAssignedOptionsPropById
  | GetOrganizationAttributeAssignedOptionsPropBySlug;

type GetOrganizationAttributeAssignedOptionsPropById = {
  organizationId: number;
  attributeId: string;
  attributeSlug?: undefined;
  skip: number;
  take: number;
  filters?: { assignedOptionIds?: string[]; teamIds?: number[] };
};

type GetOrganizationAttributeAssignedOptionsPropBySlug = {
  organizationId: number;
  attributeId?: undefined;
  attributeSlug?: string;
  skip: number;
  take: number;
  filters?: { assignedOptionIds?: string[]; teamIds?: number[] };
};

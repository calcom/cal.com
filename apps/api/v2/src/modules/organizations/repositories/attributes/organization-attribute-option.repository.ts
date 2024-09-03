import { AssignOrganizationAttributeOptionToUserInput } from "@/modules/organizations/inputs/attributes/assign/organizations-attributes-options-assign.input";
import { CreateOrganizationAttributeOptionInput } from "@/modules/organizations/inputs/attributes/options/create-organization-attribute-option.input";
import { UpdateOrganizationAttributeOptionInput } from "@/modules/organizations/inputs/attributes/options/update-organizaiton-attribute-option.input.ts";
import { OrganizationAttributesService } from "@/modules/organizations/services/attributes/organization-attributes.service";
import { OrganizationsMembershipService } from "@/modules/organizations/services/organizations-membership.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { slugify } from "@calcom/platform-libraries";

const TYPE_SUPPORTS_VALUE = new Set(["TEXT", "NUMBER"]);

@Injectable()
export class OrganizationAttributeOptionRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService,
    private readonly organizationsAttributesService: OrganizationAttributesService,
    private readonly organizationsMembershipsService: OrganizationsMembershipService
  ) {}

  async createOrganizationAttributeOption(
    organizationId: number,
    attributeId: string,
    data: CreateOrganizationAttributeOptionInput
  ) {
    return this.dbWrite.prisma.attributeOption.create({
      data: {
        ...data,
        attributeId,
      },
    });
  }

  async deleteOrganizationAttributeOption(organizationId: number, attributeId: string, optionId: string) {
    return this.dbWrite.prisma.attributeOption.delete({
      where: {
        id: optionId,
        attributeId,
      },
    });
  }

  async updateOrganizationAttributeOption(
    organizationId: number,
    attributeId: string,
    optionId: string,
    data: UpdateOrganizationAttributeOptionInput
  ) {
    return this.dbWrite.prisma.attributeOption.update({
      where: {
        id: optionId,
        attributeId,
      },
      data,
    });
  }

  async getOrganizationAttributeOptions(organizationId: number, attributeId: string) {
    return this.dbRead.prisma.attributeOption.findMany({
      where: {
        attributeId,
      },
    });
  }

  async getOrganizationAttributeOptionsForUser(organizationId: number, userId: number) {
    const options = this.dbRead.prisma.attributeOption.findMany({
      where: {
        attribute: {
          teamId: organizationId,
        },
        assignedUsers: {
          some: {
            member: {
              userId,
            },
          },
        },
      },
    });

    return options;
  }
  async assignOrganizationAttributeOptionToUser(
    organizationId: number,
    userId: number,
    data: AssignOrganizationAttributeOptionToUserInput
  ) {
    const attribute = await this.organizationsAttributesService.getOrganizationAttribute(
      organizationId,
      data.attributeId
    );
    if (!attribute) throw new Error("Attribute not found");

    if (!TYPE_SUPPORTS_VALUE.has(attribute.type) && data.value) {
      throw new Error("Attribute type does not support value");
    }
    const membership = await this.organizationsMembershipsService.getOrgMembership(organizationId, userId);

    if (!membership || !membership.accepted) throw new Error("Membership not found");

    let attributeOptionId = data.attributeOptionId;
    if (data.value && !attributeOptionId) {
      const attributeOption = await this.createOrganizationAttributeOption(organizationId, attribute.id, {
        value: data.value,
        slug: slugify(data.value),
      });
      attributeOptionId = attributeOption.id;
    }

    if (!attributeOptionId) throw new Error("Attribute option not found");

    return this.dbWrite.prisma.attributeToUser.create({
      data: {
        attributeOptionId,
        memberId: membership.id,
      },
    });
  }

  async unassignOrganizationAttributeOptionFromUser(
    organizationId: number,
    userId: number,
    attributeOptionId: string
  ) {
    const membership = await this.organizationsMembershipsService.getOrgMembership(organizationId, userId);

    if (!membership) throw new Error("Membership not found");

    return this.dbWrite.prisma.attributeToUser.delete({
      where: { memberId_attributeOptionId: { memberId: membership.id, attributeOptionId } },
    });
  }
}

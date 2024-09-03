import { CreateOrganizationAttributeOptionInput } from "@/modules/organizations/inputs/attributes/options/create-organization-attribute-option.input";
import { UpdateOrganizationAttributeOptionInput } from "@/modules/organizations/inputs/attributes/options/update-organizaiton-attribute-option.input.ts";
import { OrganizationsMembershipService } from "@/modules/organizations/services/organizations-membership.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { slugify } from "@calcom/platform-libraries";

@Injectable()
export class OrganizationAttributeOptionRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService,
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
  async assignOrganizationAttributeOptionToUser({
    organizationId,
    membershipId,
    attributeId,
    value,
    attributeOptionId,
  }: {
    organizationId: number;
    membershipId: number;
    attributeId: string;
    value?: string;
    attributeOptionId?: string;
  }) {
    let _attributeOptionId = attributeOptionId;

    if (value && !attributeOptionId) {
      _attributeOptionId = await this.createDynamicAttributeOption(organizationId, attributeId, value);
    }

    if (!_attributeOptionId) throw new Error("Attribute option not found");

    return this.dbWrite.prisma.attributeToUser.create({
      data: {
        attributeOptionId: _attributeOptionId,
        memberId: membershipId,
      },
    });
  }

  private async createDynamicAttributeOption(
    organizationId: number,
    attributeId: string,
    value: string
  ): Promise<string> {
    const attributeOption = await this.createOrganizationAttributeOption(organizationId, attributeId, {
      value: value,
      slug: slugify(value),
    });
    return attributeOption.id;
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

import { slugify } from "@calcom/platform-libraries";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { GetOrganizationAttributeAssignedOptionsProp } from "./services/organization-attributes-option.service";
import { CreateOrganizationAttributeOptionInput } from "@/modules/organizations/attributes/options/inputs/create-organization-attribute-option.input";
import { UpdateOrganizationAttributeOptionInput } from "@/modules/organizations/attributes/options/inputs/update-organizaiton-attribute-option.input.ts";
import { OrganizationsMembershipService } from "@/modules/organizations/memberships/services/organizations-membership.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class OrganizationAttributeOptionRepository {
  private readonly logger = new Logger("OrganizationAttributeOptionRepository");
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
    try {
      const deletedAttributeOption = await this.dbWrite.prisma.attributeOption.delete({
        where: {
          id: optionId,
          attributeId,
        },
      });
      return deletedAttributeOption;
    } catch (error: any) {
      if (error.code === "P2025") {
        // P2025 is the Prisma error code for "Record to delete does not exist."
        this.logger.warn(`Attribute option not found: ${optionId}`);
        throw new NotFoundException("Attribute option not found");
      }
      throw error;
    }
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

  async getOrganizationAttributeAssignedOptions({
    attributeId,
    attributeSlug,
    filters,
    organizationId,
    skip,
    take,
  }: GetOrganizationAttributeAssignedOptionsProp) {
    const options = await this.dbRead.prisma.attributeOption.findMany({
      where: {
        attribute: {
          ...(attributeId && { id: attributeId }),
          ...(attributeSlug && { slug: attributeSlug }),
          teamId: organizationId,
        },
        assignedUsers: {
          some: {}, // empty {} statement checks if option is assigned to at least one user
          ...(filters?.teamIds && {
            some: { member: { user: { teams: { some: { teamId: { in: filters.teamIds } } } } } },
          }),
        },
      },
      include: { assignedUsers: { include: { member: true } } },
      skip,
      take,
    });

    // only return options that are assigned to users alongside assignedOptionIds filter
    if (filters?.assignedOptionIds) {
      const filteredAssignedOptions = await this.dbRead.prisma.attributeOption.findMany({
        where: {
          attribute: { teamId: organizationId },
          assignedUsers: {
            every: {
              attributeOptionId: { in: filters?.assignedOptionIds },
            },
            ...(filters?.teamIds && {
              some: { member: { user: { teams: { some: { teamId: { in: filters.teamIds } } } } } },
            }),
          },
        },
        include: { assignedUsers: { include: { member: true } } },
      });

      if (!filteredAssignedOptions?.length) {
        throw new NotFoundException(
          "Options provided in assignedOptionIds are not assigned to anyone, or the users are not part of the teams specified in teamIds filter."
        );
      }

      const matchingUserIds = filteredAssignedOptions.flatMap((opt) =>
        opt.assignedUsers.flatMap((assignedUser) => assignedUser.member.userId)
      );
      // reduce remove options that are not assigned alongside assignedOptionIds filter
      return options.reduce(
        (acc, opt) => {
          if (
            opt.assignedUsers.some((assignedUser) => matchingUserIds.includes(assignedUser.member.userId))
          ) {
            return [
              ...acc,
              {
                ...opt,
                assignedUserIds: opt.assignedUsers.map((attributeToUser) => attributeToUser.member.userId),
              },
            ];
          }
          return acc;
        },
        [] as typeof options
      );
    }

    return options.map((opt) => {
      return {
        ...opt,
        assignedUserIds: opt.assignedUsers.map((attributeToUser) => attributeToUser.member.userId),
      };
    });
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
    const membership = await this.organizationsMembershipsService.getOrgMembershipByUserId(
      organizationId,
      userId
    );

    if (!membership) throw new Error("Membership not found");

    try {
      const deletedAttributeToUser = await this.dbWrite.prisma.attributeToUser.delete({
        where: { memberId_attributeOptionId: { memberId: membership.id, attributeOptionId } },
      });
      return deletedAttributeToUser;
    } catch (error: any) {
      if (error.code === "P2025") {
        // P2025 is the Prisma error code for "Record to delete does not exist."
        this.logger.warn(`Attribute option not found: ${attributeOptionId} for user ${userId}`);
        throw new NotFoundException("Attribute does not belong to this user");
      }
      throw error;
    }
  }
}

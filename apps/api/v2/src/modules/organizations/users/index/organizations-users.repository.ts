import type { AttributeToUser, Membership, Prisma, Profile, User } from "@calcom/prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class OrganizationsUsersRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  private filterOnOrgMembership(orgId: number) {
    return {
      profiles: {
        some: {
          organizationId: orgId,
        },
      },
    };
  }

  async getOrganizationUsersByEmailsAndAttributeFilters(
    orgId: number,
    filters: {
      teamIds?: number[];
      assignedOptionIds: string[];
      attributeQueryOperator?: "AND" | "OR" | "NONE";
    },
    emailArray?: string[],
    skip?: number,
    take?: number
  ) {
    const { teamIds, assignedOptionIds, attributeQueryOperator } = filters ?? {};
    const attributeToUsersWithProfile = await this.dbRead.prisma.attributeToUser.findMany({
      include: {
        member: { include: { user: { include: { profiles: { where: { organizationId: orgId } } } } } },
      },
      distinct: ["memberId"],
      where: {
        member: {
          teamId: orgId,
          ...(teamIds && { user: { teams: { some: { teamId: { in: teamIds } } } } }),
          // Filter to only get users which have ALL of the assigned attribute options
          ...(attributeQueryOperator === "AND" && {
            AND: assignedOptionIds.map((optionId) => ({
              AttributeToUser: { some: { attributeOptionId: optionId } },
            })),
          }),
        },
        ...(emailArray && emailArray.length ? { email: { in: emailArray } } : {}),
        // Filter to get users which have AT LEAST ONE of the assigned attribute options
        ...(attributeQueryOperator === "OR" && {
          attributeOption: { id: { in: assignedOptionIds } },
        }),
        // Filter to  get users that have NONE the assigned attribute options
        ...(attributeQueryOperator === "NONE" && {
          NOT: {
            attributeOption: { id: { in: assignedOptionIds } },
          },
        }),
      },
      skip,
      take,
    });
    return attributeToUsersWithProfile.map(
      (
        attributeToUser: AttributeToUser & { member: Membership & { user: User & { profiles: Profile[] } } }
      ) => attributeToUser.member.user
    );
  }

  async getOrganizationUsersByEmails(
    orgId: number,
    emailArray?: string[],
    teamIds?: number[],
    skip?: number,
    take?: number
  ) {
    return await this.dbRead.prisma.user.findMany({
      where: {
        ...this.filterOnOrgMembership(orgId),
        ...(emailArray && emailArray.length ? { email: { in: emailArray } } : {}),
        ...(teamIds && { teams: { some: { teamId: { in: teamIds } } } }),
      },
      include: {
        profiles: {
          where: {
            organizationId: orgId,
          },
        },
      },
      skip,
      take,
    });
  }

  async getOrganizationUsersByIds(orgId: number, userIds: number[]) {
    return await this.dbRead.prisma.user.findMany({
      where: {
        profiles: {
          some: {
            organizationId: orgId,
            userId: { in: userIds },
          },
        },
      },
      include: {
        profiles: true,
      },
    });
  }

  async getOrganizationUserByEmail(orgId: number, email: string) {
    return await this.dbRead.prisma.user.findFirst({
      where: {
        email,
        ...this.filterOnOrgMembership(orgId),
      },
      include: {
        profiles: {
          where: {
            organizationId: orgId,
          },
        },
      },
    });
  }

  async updateOrganizationUser(orgId: number, userId: number, updateUserBody: Prisma.UserUpdateInput) {
    return await this.dbWrite.prisma.user.update({
      where: {
        id: userId,
        organizationId: orgId,
      },
      data: updateUserBody,
      include: {
        profiles: {
          where: {
            organizationId: orgId,
          },
        },
      },
    });
  }

  async deleteUser(orgId: number, userId: number) {
    return await this.dbWrite.prisma.user.delete({
      where: {
        id: userId,
        OR: [
          { organizationId: orgId },
          {
            profiles: {
              some: {
                organizationId: orgId,
              },
            },
          },
        ],
      },
      include: {
        profiles: {
          where: {
            organizationId: orgId,
          },
        },
      },
    });
  }

  async getOrganizationUserByUsername(orgId: number, username: string) {
    const profile = await this.dbRead.prisma.profile.findUnique({
      where: {
        username_organizationId: {
          organizationId: orgId,
          username,
        },
      },
      include: {
        user: true,
      },
    });
    return profile?.user;
  }
}

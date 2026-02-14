import { CreateOrgMembershipDto } from "@/modules/organizations/memberships/inputs/create-organization-membership.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { MembershipUserSelect } from "@/modules/teams/memberships/teams-memberships.repository";
import { Injectable } from "@nestjs/common";

import type { Prisma } from "@calcom/prisma/client";

import type { UpdateOrgMembershipDto } from "./inputs/update-organization-membership.input";

export type DbOrgMembership = Awaited<ReturnType<OrganizationsMembershipRepository["findOrgMembership"]>>;

const attributeToUserSelect = {
  createdByDSyncId: true,
  weight: true,
  attributeOption: {
    select: {
      id: true,
      value: true,
      slug: true,
      attribute: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  },
} as const satisfies Prisma.AttributeToUserSelect;

@Injectable()
export class OrganizationsMembershipRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async findOrgMembership(organizationId: number, membershipId: number) {
    return this.dbRead.prisma.membership.findUnique({
      where: {
        id: membershipId,
        teamId: organizationId,
      },
      include: {
        user: { select: MembershipUserSelect },
        AttributeToUser: {
          select: attributeToUserSelect,
        },
      },
    });
  }

  async findOrgMembershipByUserId(organizationId: number, userId: number) {
    return this.dbRead.prisma.membership.findFirst({
      where: {
        teamId: organizationId,
        userId,
      },
      include: {
        user: { select: MembershipUserSelect },
        AttributeToUser: {
          select: attributeToUserSelect,
        },
      },
    });
  }

  async deleteOrgMembership(organizationId: number, membershipId: number) {
    return this.dbWrite.prisma.membership.delete({
      where: {
        id: membershipId,
        teamId: organizationId,
      },
      include: {
        user: { select: MembershipUserSelect },
        AttributeToUser: {
          select: attributeToUserSelect,
        },
      },
    });
  }

  async createOrgMembership(organizationId: number, data: CreateOrgMembershipDto) {
    return this.dbWrite.prisma.membership.upsert({
      create: { ...data, teamId: organizationId },
      update: { role: data.role, accepted: data.accepted, disableImpersonation: data.disableImpersonation },
      where: { userId_teamId: { userId: data.userId, teamId: organizationId } },
      include: {
        user: { select: MembershipUserSelect },
        AttributeToUser: {
          select: attributeToUserSelect,
        },
      },
    });
  }
  async updateOrgMembership(organizationId: number, membershipId: number, data: UpdateOrgMembershipDto) {
    return this.dbWrite.prisma.membership.update({
      data: { ...data },
      where: { id: membershipId, teamId: organizationId },
      include: {
        user: { select: MembershipUserSelect },
        AttributeToUser: {
          select: attributeToUserSelect,
        },
      },
    });
  }

  async findOrgMembershipsPaginated(organizationId: number, skip: number, take: number) {
    return this.dbRead.prisma.membership.findMany({
      where: {
        teamId: organizationId,
      },
      include: {
        user: { select: MembershipUserSelect },
        AttributeToUser: {
          select: attributeToUserSelect,
        },
      },
      skip,
      take,
    });
  }
}

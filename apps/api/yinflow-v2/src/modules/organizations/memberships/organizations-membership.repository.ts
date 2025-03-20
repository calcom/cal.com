import { Injectable } from "@nestjs/common";

import { CreateOrgMembershipDto } from "../../organizations/memberships/inputs/create-organization-membership.input";
import { PrismaReadService } from "../../prisma/prisma-read.service";
import { PrismaWriteService } from "../../prisma/prisma-write.service";
import { UpdateOrgMembershipDto } from "./inputs/update-organization-membership.input";

@Injectable()
export class OrganizationsMembershipRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async findOrgMembership(organizationId: number, membershipId: number) {
    return this.dbRead.prisma.membership.findUnique({
      where: {
        id: membershipId,
        teamId: organizationId,
      },
    });
  }

  async findOrgMembershipByUserId(organizationId: number, userId: number) {
    return this.dbRead.prisma.membership.findFirst({
      where: {
        teamId: organizationId,
        userId,
      },
    });
  }

  async deleteOrgMembership(organizationId: number, membershipId: number) {
    return this.dbWrite.prisma.membership.delete({
      where: {
        id: membershipId,
        teamId: organizationId,
      },
    });
  }

  async createOrgMembership(organizationId: number, data: CreateOrgMembershipDto) {
    return this.dbWrite.prisma.membership.create({
      data: { ...data, teamId: organizationId },
    });
  }

  async updateOrgMembership(organizationId: number, membershipId: number, data: UpdateOrgMembershipDto) {
    return this.dbWrite.prisma.membership.update({
      data: { ...data },
      where: { id: membershipId, teamId: organizationId },
    });
  }

  async findOrgMembershipsPaginated(organizationId: number, skip: number, take: number) {
    return this.dbRead.prisma.membership.findMany({
      where: {
        teamId: organizationId,
      },
      skip,
      take,
    });
  }
}

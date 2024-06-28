import { CreateOrgMembershipDto } from "@/modules/organizations/inputs/create-organization-membership.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { StripeService } from "@/modules/stripe/stripe.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsMembershipRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService,
    private readonly stripeService: StripeService
  ) {}

  private async findAllTeamsInOrg(organizationId: number) {
    const teams = await this.dbRead.prisma.team.findMany({
      where: {
        OR: [
          {
            parentId: organizationId,
          },
          {
            id: organizationId,
          },
        ],
      },
      select: {
        id: true,
      },
    });

    return teams.map((team) => team.id);
  }

  async findOrgMembership(organizationId: number, membershipId: number) {
    const teams = await this.findAllTeamsInOrg(organizationId);
    return this.dbRead.prisma.membership.findUnique({
      where: {
        id: membershipId,
        teamId: { in: teams },
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

  async updateOrgMembership(organizationId: number, membershipId: number, data: CreateOrgMembershipDto) {
    return this.dbWrite.prisma.membership.update({
      data: { ...data },
      where: { id: membershipId, teamId: organizationId },
    });
  }

  async findOrgMembershipsPaginated(organizationId: number, skip: number, take: number) {
    const teams = await this.findAllTeamsInOrg(organizationId);
    return this.dbRead.prisma.membership.findMany({
      where: {
        teamId: { in: teams },
      },
      skip,
      take,
    });
  }
}

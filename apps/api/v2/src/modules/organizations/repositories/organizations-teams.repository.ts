import { PlatformPlan } from "@/modules/billing/types";
import { CreateOrgTeamDto } from "@/modules/organizations/inputs/create-organization-team.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { StripeService } from "@/modules/stripe/stripe.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsTeamsRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService,
    private readonly stripeService: StripeService
  ) {}

  async findOrgTeam(organizationId: number, teamId: number) {
    return this.dbRead.prisma.team.findUnique({
      where: {
        id: teamId,
        isOrganization: false,
        parentId: organizationId,
      },
    });
  }

  async deleteOrgTeam(organizationId: number, teamId: number) {
    return this.dbRead.prisma.team.delete({
      where: {
        id: teamId,
        isOrganization: false,
        parentId: organizationId,
      },
    });
  }

  async createOrgTeam(organizationId: number, data: CreateOrgTeamDto) {
    return this.dbRead.prisma.team.create({
      data: { ...data, parentId: organizationId },
    });
  }

  async updateOrgTeam(organizationId: number, teamId: number, data: CreateOrgTeamDto) {
    return this.dbRead.prisma.team.update({
      data: { ...data },
      where: { id: teamId, parentId: organizationId, isOrganization: false },
    });
  }

  async findOrgTeamsPaginated(organizationId: number, skip: number, take: number) {
    return this.dbRead.prisma.team.findMany({
      where: {
        parentId: organizationId,
      },
      skip,
      take,
    });
  }
}

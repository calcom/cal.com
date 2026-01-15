import { PlatformPlan } from "@/modules/billing/types";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { StripeService } from "@/modules/stripe/stripe.service";
import { Injectable } from "@nestjs/common";

import { OrganizationRepository } from "@calcom/platform-libraries/organizations";
import { Prisma } from "@calcom/prisma/client";

@Injectable()
export class OrganizationsRepository extends OrganizationRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService,
    private readonly stripeService: StripeService
  ) {
    super({ prismaClient: dbWrite.prisma });
  }

  async findByIds(organizationIds: number[]) {
    return this.dbRead.prisma.team.findMany({
      where: {
        id: {
          in: organizationIds,
        },
        isOrganization: true,
      },
    });
  }

  async findByIdIncludeBilling(orgId: number) {
    return this.dbRead.prisma.team.findUnique({
      where: {
        id: orgId,
      },
      include: {
        platformBilling: true,
      },
    });
  }

  async createNewBillingRelation(orgId: number, plan?: PlatformPlan) {
    const { id } = await this.stripeService.getStripe().customers.create({
      metadata: {
        createdBy: "oauth_client_no_csid", // mark in case this is needed in the future.
      },
    });

    await this.dbWrite.prisma.team.update({
      where: {
        id: orgId,
      },
      data: {
        platformBilling: {
          create: {
            customerId: id,
            plan: plan ? plan.toString() : "none",
          },
        },
      },
    });

    return id;
  }

  async findTeamIdAndSlugFromClientId(clientId: string) {
    return this.dbRead.prisma.team.findFirstOrThrow({
      where: {
        platformOAuthClient: {
          some: {
            id: clientId,
          },
        },
      },
      select: {
        id: true,
        slug: true,
      },
    });
  }

  async findPlatformOrgFromUserId(userId: number) {
    return this.dbRead.prisma.team.findFirstOrThrow({
      where: {
        orgProfiles: {
          some: {
            userId: userId,
          },
        },
        isPlatform: true,
        isOrganization: true,
      },
      select: {
        id: true,
        isPlatform: true,
        isOrganization: true,
      },
    });
  }

  async findOrgUser(organizationId: number, userId: number) {
    return this.dbRead.prisma.user.findUnique({
      where: {
        id: userId,
        profiles: {
          some: {
            organizationId,
          },
        },
      },
    });
  }

  async findOrgTeamUser(organizationId: number, teamId: number, userId: number) {
    return this.dbRead.prisma.user.findUnique({
      where: {
        id: userId,
        profiles: {
          some: {
            organizationId,
          },
        },
        teams: {
          some: {
            teamId: teamId,
          },
        },
      },
    });
  }

  async fetchOrgAdminApiStatus(organizationId: number) {
    return this.dbRead.prisma.organizationSettings.findUnique({
      where: {
        organizationId,
      },
      select: {
        isAdminAPIEnabled: true,
      },
    });
  }

  async update(organizationId: number, data: Prisma.TeamUpdateInput) {
    return this.dbWrite.prisma.team.update({
      where: {
        id: organizationId,
        isOrganization: true,
      },
      data,
    });
  }

  async delete(organizationId: number) {
    return this.dbWrite.prisma.team.delete({
      where: {
        id: organizationId,
        isOrganization: true,
      },
    });
  }

  async findOrgBySlug(slug: string) {
    return this.dbRead.prisma.team.findFirst({
      where: {
        slug,
        parentId: null,
        isOrganization: true,
      },
    });
  }

  async findTeamByPlatformBillingId(billingId: number) {
    return this.dbRead.prisma.team.findFirst({
      where: {
        platformBilling: {
          id: billingId,
        },
      },
    });
  }
}

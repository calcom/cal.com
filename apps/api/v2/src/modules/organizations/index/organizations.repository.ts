import { Prisma } from "@calcom/prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { StripeService } from "@/modules/stripe/stripe.service";

@Injectable()
export class OrganizationsRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService,
    private readonly stripeService: StripeService
  ) {}

  async findById(args: { id: number }) {
    return this.dbRead.prisma.team.findUnique({
      where: {
        id: args.id,
      },
    });
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

}

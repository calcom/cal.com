import type { PrismaClient } from "@calcom/prisma";

export class TeamRepository {
  constructor(private prismaClient: PrismaClient) {}

  static async withGlobalPrisma() {
    return new TeamRepository((await import("@calcom/prisma")).prisma);
  }

  async findOrganizationBySlug(slug: string) {
    return this.prismaClient.team.findFirst({
      where: {
        slug,
        isOrganization: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });
  }

  async upsertOrganizationSettings({
    organizationId,
    isAdminAPIEnabled,
    orgAutoAcceptEmail,
  }: {
    organizationId: number;
    isAdminAPIEnabled: boolean;
    orgAutoAcceptEmail?: string;
  }) {
    return this.prismaClient.organizationSettings.upsert({
      where: {
        organizationId,
      },
      update: {
        isAdminAPIEnabled,
      },
      create: {
        organizationId,
        orgAutoAcceptEmail: orgAutoAcceptEmail || "",
        isAdminAPIEnabled,
      },
    });
  }

  async findUserMembershipsInOrg({
    userEmail,
    organizationId,
  }: {
    userEmail: string;
    organizationId: number;
  }) {
    return this.prismaClient.membership.findMany({
      where: {
        user: {
          email: userEmail,
        },
        teamId: organizationId,
      },
      select: {
        id: true,
        role: true,
        accepted: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }
}

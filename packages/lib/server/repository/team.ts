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

  async ensureMembership({
    userEmail,
    organizationId,
    role,
    accepted,
  }: {
    userEmail: string;
    organizationId: number;
    role: "OWNER" | "ADMIN";
    accepted: boolean;
  }) {
    const user = await this.prismaClient.user.findFirst({
      where: { email: userEmail },
    });

    if (!user) {
      throw new Error(`User with email ${userEmail} not found`);
    }

    const existingMembership = await this.prismaClient.membership.findFirst({
      where: {
        userId: user.id,
        teamId: organizationId,
      },
    });

    if (existingMembership) {
      return this.prismaClient.membership.update({
        where: { id: existingMembership.id },
        data: {
          role,
          accepted,
        },
      });
    }

    return this.prismaClient.membership.create({
      data: {
        userId: user.id,
        teamId: organizationId,
        role,
        accepted,
      },
    });
  }
}

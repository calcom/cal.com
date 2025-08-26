import prisma, { safeCredentialSelect } from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";

import type { AppRepositoryInterface } from "./AppRepository.interface";

export class PrismaAppRepository implements AppRepositoryInterface {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  private appMetadataSelect = {
    slug: true,
    dirName: true,
    type: true,
    categories: true,
    name: true,
    description: true,
    logo: true,
    enabled: true,
    extendsFeature: true,
    dependencies: true,
  };

  async getMetadataFromSlug(slug: string) {
    return await this.prismaClient.app.findUnique({
      where: {
        slug,
      },
      select: this.appMetadataSelect,
    });
  }

  async getAllEnabledApps() {
    return await this.prismaClient.app.findMany({
      where: {
        enabled: true,
      },
      select: this.appMetadataSelect,
    });
  }

  async getAllEnabledAppsWithCredentials({
    userId,
    teamIds,
  }: {
    userId: number;
    teamIds?: number[];
  }): Promise<AppMetadataResult[]> {
    return await this.prismaClient.app.findMany({
      where: {
        enabled: true,
      },
      select: {
        ...this.appMetadataSelect,
        credentials: {
          where: { OR: [{ userId }, { teamId: { in: teamIds || [] } }] },
          select: safeCredentialSelect,
          orderBy: {
            credentials: {
              _count: "desc",
            },
          },
        },
      },
    });
  }
}

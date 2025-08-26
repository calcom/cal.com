import prisma from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";

import type { AppRepositoryInterface } from "./AppRepository.interface";

export class PrismaAppRepository implements AppRepositoryInterface {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async getMetadataFromSlug(slug: string) {
    return await this.prismaClient.app.findUnique({
      where: {
        slug,
      },
      select: {
        slug: true,
        dirName: true,
        type: true,
        categories: true,
        name: true,
        description: true,
        logo: true,
        enabled: true,
        extendsFeature: true,
      },
    });
  }
}

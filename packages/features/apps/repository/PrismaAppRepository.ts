import { captureException } from "@sentry/nextjs";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export class PrismaAppRepository {
  static async seedApp(dirName: string, keys?: Prisma.InputJsonValue) {
    const appMetadata = appStoreMetadata[dirName as keyof typeof appStoreMetadata];

    if (!appMetadata) {
      throw new Error(`App ${dirName} not found`);
    }

    await prisma.app.create({
      data: {
        slug: appMetadata.slug,
        categories: appMetadata.categories,
        dirName: dirName,
        keys,
        enabled: true,
      },
    });
  }

  static async findAppStore() {
    try {
      return await prisma.app.findMany({ select: { slug: true } });
    } catch (error) {
      captureException(error);
      throw error;
    }
  }
}

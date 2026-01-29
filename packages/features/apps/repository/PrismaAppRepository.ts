import { captureException } from "@sentry/nextjs";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { shouldEnableApp } from "@calcom/app-store/_utils/validateAppKeys";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export class PrismaAppRepository {
  static async seedApp(dirName: string, keys?: Prisma.InputJsonValue) {
    const appMetadataFn = appStoreMetadata[dirName as keyof typeof appStoreMetadata];
    
    if (!appMetadataFn) {
      throw new Error(`App ${dirName} not found`);
    }

    const module = typeof appMetadataFn === "function" ? await appMetadataFn() : appMetadataFn;
    const appMetadata = (module as any).default || (module as any).metadata || module;

    if (!appMetadata) {
      throw new Error(`App ${dirName} NOT Loaded`);
    }

    // Only enable if keys are valid (or app doesn't require keys)
    const enabled = shouldEnableApp(dirName, keys as Prisma.JsonValue);
    await prisma.app.create({
      data: {
        slug: appMetadata.slug,
        categories: appMetadata.categories,
        dirName: dirName,
        keys,
        enabled,
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

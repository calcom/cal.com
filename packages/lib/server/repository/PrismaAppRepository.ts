import { captureException } from "@sentry/nextjs";

// eslint-disable-next-line no-restricted-imports
import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { prisma } from "@calcom/prisma";

export class PrismaAppRepository {
  static async seedApp(dirName: string, keys?: object) {
    try {
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
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  static async findAppStore() {
    try {
      return await prisma.app.findMany({ select: { slug: true } });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}

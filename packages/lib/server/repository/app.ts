import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { prisma } from "@calcom/prisma";

export class AppRepository {
  static async seedApp(dirName: string, keys?: any) {
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
    return await prisma.app.findMany({ select: { slug: true } });
  }
}

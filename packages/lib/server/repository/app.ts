import type { Prisma } from "@prisma/client";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { appKeysSchemas } from "@calcom/app-store/apps.keys-schemas.generated";
import { getLocalAppMetadata } from "@calcom/app-store/utils";
import { prisma } from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";
import type { TListLocalInputSchema } from "@calcom/trpc/server/routers/viewer/apps/listLocal.schema";

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

  static async getAppsList({ input }: { input: TListLocalInputSchema }) {
    const category = input.category;
    const localApps = getLocalAppMetadata();

    const dbApps = await prisma.app.findMany({
      where: {
        categories: {
          has: AppCategories[category as keyof typeof AppCategories],
        },
      },
      select: {
        slug: true,
        keys: true,
        enabled: true,
        dirName: true,
      },
    });

    return localApps.flatMap((app) => {
      // Filter applications that does not belong to the current requested category.
      if (!(app.category === category || app.categories?.some((appCategory) => appCategory === category))) {
        return [];
      }

      // Find app metadata
      const dbData = dbApps.find((dbApp) => dbApp.slug === app.slug);

      // If the app already contains keys then return
      if (dbData?.keys) {
        return {
          name: app.name,
          slug: app.slug,
          logo: app.logo,
          title: app.title,
          type: app.type,
          description: app.description,
          // We know that keys are going to be an object or null. Prisma can not type check against JSON fields
          keys: dbData.keys as Prisma.JsonObject | null,
          dirName: app.dirName || app.slug,
          enabled: dbData?.enabled || false,
          isTemplate: app.isTemplate,
        };
      }

      const keysSchema = appKeysSchemas[app.dirName as keyof typeof appKeysSchemas];

      const keys: Record<string, string> = {};

      // `typeof val === 'undefined'` is always slower than !== undefined comparison
      // it is important to avoid string to string comparisons as much as we can
      if (keysSchema !== undefined) {
        // TODO: Why don't we parse with schema here? Not doing it makes default() not work in schema.
        Object.values(keysSchema.keyof()._def.values).reduce((keysObject, key) => {
          keys[key as string] = "";
          return keysObject;
        }, {} as Record<string, string>);
      }

      return {
        name: app.name,
        slug: app.slug,
        logo: app.logo,
        type: app.type,
        title: app.title,
        description: app.description,
        enabled: dbData?.enabled ?? false,
        dirName: app.dirName ?? app.slug,
        keys: Object.keys(keys).length === 0 ? null : keys,
      };
    });
  }
}

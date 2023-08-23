import type { Prisma } from "@prisma/client";

import { appKeysSchemas } from "@calcom/app-store/apps.keys-schemas.generated";
import { getLocalAppMetadata } from "@calcom/app-store/utils";
import type { PrismaClient } from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../trpc";
import type { TListLocalInputSchema } from "./listLocal.schema";

type ListLocalOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TListLocalInputSchema;
};

export const listLocalHandler = async ({ ctx, input }: ListLocalOptions) => {
  const { prisma } = ctx;
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
};

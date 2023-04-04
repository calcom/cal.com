import type { AppCategories, Prisma } from "@prisma/client";

import { appKeysSchemas } from "@calcom/app-store/apps.keys-schemas.generated";

import { TRPCError } from "@trpc/server";

import type { TRPCEndpointOptions } from "../../../trpc";
import type { saveKeysSchema } from "./schemas/saveKeysSchema";

export const saveKeys = async ({ ctx, input }: TRPCEndpointOptions<typeof saveKeysSchema>) => {
  const { deriveAppDictKeyFromType } = await import("@calcom/lib/deriveAppDictKeyFromType");
  const appKey = deriveAppDictKeyFromType(input.type, appKeysSchemas);
  const keysSchema = appKeysSchemas[appKey as keyof typeof appKeysSchemas];
  const keys = keysSchema.parse(input.keys);
  const { getLocalAppMetadata } = await import("@calcom/app-store/utils");
  // Get app name from metadata
  const localApps = getLocalAppMetadata();
  const appMetadata = localApps.find((localApp) => localApp.slug === input.slug);

  if (!appMetadata?.dirName && appMetadata?.categories)
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "App metadata could not be found" });

  await ctx.prisma.app.upsert({
    where: {
      slug: input.slug,
    },
    update: { keys },
    create: {
      slug: input.slug,
      dirName: appMetadata?.dirName || "",
      categories:
        (appMetadata?.categories as AppCategories[]) ||
        ([appMetadata?.category] as AppCategories[]) ||
        undefined,
      keys: (input.keys as Prisma.InputJsonObject) || undefined,
    },
  });
};

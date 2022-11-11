import z from "zod";

import { appKeysSchemas } from "@calcom/app-store/apps.keys-schemas.generated";
import { getLocalAppMetadata } from "@calcom/app-store/utils";
import { deriveAppDictKeyFromType } from "@calcom/lib/deriveAppDictKeyFromType";

import { createProtectedRouter } from "../../createRouter";

export const appsRouter = createProtectedRouter()
  .query("listLocal", {
    input: z.object({
      variant: z.string(),
    }),
    async resolve({ ctx, input }) {
      const allApps = getLocalAppMetadata();

      const filteredApps = [];

      for (const app of allApps) {
        // Skip to next iteration if app does not fit the variant
        if (app.variant === input.variant) {
          // Check if the app already contains keys
          const appKeys = await ctx.prisma.app.findFirst({
            where: { slug: app.slug },
            select: { keys: true },
          });
          console.log("🚀 ~ file: apps.tsx ~ line 25 ~ filteredApps ~ appKeys", appKeys);
          if (appKeys) {
            filteredApps.push({
              name: app.name,
              logo: app.logo,
              title: app.title,
              description: app.description,
              keys: appKeys.keys,
            });
          } else {
            const appKey = deriveAppDictKeyFromType(app.type, appKeysSchemas);
            const keysSchema = appKeysSchemas[appKey as keyof typeof appKeysSchemas] || null;
            filteredApps.push({ ...app, keys: keysSchema ? keysSchema.keyof()._def.values : null });
          }
        }
      }

      // const filteredApps = await allApps.reduce(async (filteredApps, app) => {
      //   // Skip to next iteration if app does not fit the variant
      //   if (app.variant === input.variant) {
      //     // Check if the app already contains keys
      //     const appKeys = await ctx.prisma.app.findFirst({
      //       where: { slug: app.slug },
      //       select: { keys: true },
      //     });
      //     console.log("🚀 ~ file: apps.tsx ~ line 25 ~ filteredApps ~ appKeys", appKeys);

      //     if (appKeys) {
      //       filteredApps.push({
      //         name: app.name,
      //         logo: app.logo,
      //         title: app.title,
      //         description: app.description,
      //         keys: appKeys,
      //       });
      //     } else {
      //       const appKey = deriveAppDictKeyFromType(app.type, appKeysSchemas);
      //       const keysSchema = appKeysSchemas[appKey as keyof typeof appKeysSchemas] || null;

      //       filteredApps.push({ ...app, keys: keysSchema ? keysSchema.keyof()._def.values : null });
      //     }
      //   }

      //   return filteredApps;
      // }, []);
      console.log("🚀 ~ file: apps.tsx ~ line 43 ~ filteredApps ~ filteredApps", filteredApps);

      return filteredApps;
    },
  })
  .mutation("enable", {
    input: z.object({
      appName: z.string(),
      keys: z.any(),
    }),
    async resolve({ ctx, input }) {
      console.log("🚀 ~ file: apps.tsx ~ line 25 ~ resolve ~ input", input);
      return;
    },
  });

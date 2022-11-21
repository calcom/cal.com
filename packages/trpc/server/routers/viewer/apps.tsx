import { AppCategories } from "@prisma/client";
import z from "zod";

import { appKeysSchemas } from "@calcom/app-store/apps.keys-schemas.generated";
import { getLocalAppMetadata } from "@calcom/app-store/utils";
import getEnabledApps from "@calcom/lib/apps/getEnabledApps";
import { deriveAppDictKeyFromType } from "@calcom/lib/deriveAppDictKeyFromType";

import { TRPCError } from "@trpc/server";

import { router, authedProcedure } from "../../trpc";

export const appsRouter = router({
  listLocal: authedProcedure
    .input(
      z.object({
        variant: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN")
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });

      const localApps = getLocalAppMetadata();
      const dbApps = await ctx.prisma.app.findMany({
        where: {
          categories: {
            has: input.variant === "conferencing" ? "video" : (input.variant as AppCategories),
          },
        },
        select: {
          slug: true,
          keys: true,
          enabled: true,
        },
      });

      const filteredApps = [];

      for (const app of localApps) {
        if (app.variant === input.variant) {
          // Find app metadata
          const dbData = dbApps.find((dbApp) => dbApp.slug === app.slug);

          // If the app already contains keys then return
          if (dbData?.keys) {
            filteredApps.push({
              name: app.name,
              slug: app.slug,
              logo: app.logo,
              title: app.title,
              type: app.type,
              description: app.description,
              keys: dbData.keys,
              enabled: dbData?.enabled || false,
            });
          } else {
            const appKey = deriveAppDictKeyFromType(app.type, appKeysSchemas);
            const keysSchema = appKeysSchemas[appKey as keyof typeof appKeysSchemas] || null;
            filteredApps.push({
              name: app.name,
              slug: app.slug,
              logo: app.logo,
              type: app.type,
              title: app.title,
              description: app.description,
              enabled: dbData?.enabled || false,
              keys: keysSchema ? keysSchema.keyof()._def.values : null,
            });
          }
        }
      }
      return filteredApps;
    }),
  toggle: authedProcedure
    .input(
      z.object({
        slug: z.string(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN")
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });

      const app = await ctx.prisma.app.update({
        where: {
          slug: input.slug,
        },
        data: {
          enabled: !input.enabled,
        },
      });
      return app.enabled;
    }),
  saveKeys: authedProcedure
    .input(
      z.object({
        slug: z.string(),
        type: z.string(),
        // Validate w/ app specific schema
        keys: z.unknown(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN")
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      const appKey = deriveAppDictKeyFromType(input.type, appKeysSchemas);
      const keysSchema = appKeysSchemas[appKey as keyof typeof appKeysSchemas];

      const parse = keysSchema.parse(input.keys);

      await ctx.prisma.app.update({
        where: {
          slug: input.slug,
        },
        data: {
          keys: input.keys,
        },
      });

      return;
    }),
});

import { v4 } from "uuid";
import { z } from "zod";

import { generateUniqueAPIKey } from "@calcom/features/ee/api-keys/lib/apiKeys";

import { createProtectedRouter } from "../../createRouter";

export const apiKeysRouter = createProtectedRouter()
  .query("list", {
    async resolve({ ctx }) {
      return await ctx.prisma.apiKey.findMany({
        where: {
          userId: ctx.user.id,
          OR: [
            {
              NOT: {
                appId: "zapier",
              },
            },
            {
              appId: null,
            },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
    },
  })
  .query("findKeyOfType", {
    input: z.object({
      appId: z.string().optional().nullable(),
    }),
    async resolve({ ctx, input }) {
      return await ctx.prisma.apiKey.findFirst({
        where: {
          AND: [
            {
              userId: ctx.user.id,
            },
            {
              appId: input.appId,
            },
          ],
        },
      });
    },
  })
  .mutation("create", {
    input: z.object({
      note: z.string().optional().nullish(),
      expiresAt: z.date().optional().nullable(),
      neverExpires: z.boolean().optional(),
      appId: z.string().optional().nullable(),
    }),
    async resolve({ ctx, input }) {
      const [hashedApiKey, apiKey] = generateUniqueAPIKey();
      // Here we snap never expires before deleting it so it's not passed to prisma create call.
      const neverExpires = input.neverExpires;
      delete input.neverExpires;
      await ctx.prisma.apiKey.create({
        data: {
          id: v4(),
          userId: ctx.user.id,
          ...input,
          // And here we pass a null to expiresAt if never expires is true. otherwise just pass expiresAt from input
          expiresAt: neverExpires ? null : input.expiresAt,
          hashedKey: hashedApiKey,
        },
      });
      const prefixedApiKey = `${process.env.API_KEY_PREFIX ?? "cal_"}${apiKey}`;
      return prefixedApiKey;
    },
  })
  .mutation("edit", {
    input: z.object({
      id: z.string(),
      note: z.string().optional().nullish(),
      expiresAt: z.date().optional(),
    }),
    async resolve({ ctx, input }) {
      const { id, ...data } = input;
      const {
        apiKeys: [updatedApiKey],
      } = await ctx.prisma.user.update({
        where: {
          id: ctx.user.id,
        },
        data: {
          apiKeys: {
            update: {
              where: {
                id,
              },
              data,
            },
          },
        },
        select: {
          apiKeys: {
            where: {
              id,
            },
          },
        },
      });
      return updatedApiKey;
    },
  })
  .mutation("delete", {
    input: z.object({
      id: z.string(),
      eventTypeId: z.number().optional(),
    }),
    async resolve({ ctx, input }) {
      const { id } = input;
      await ctx.prisma.user.update({
        where: {
          id: ctx.user.id,
        },
        data: {
          apiKeys: {
            delete: {
              id,
            },
          },
        },
      });
      return {
        id,
      };
    },
  });

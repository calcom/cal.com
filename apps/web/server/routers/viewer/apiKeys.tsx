import { v4 } from "uuid";
import { z } from "zod";

import { generateUniqueAPIKey } from "@calcom/ee/lib/api/apiKeys";
import { getErrorFromUnknown } from "@calcom/lib/errors";

// import { WEBHOOK_TRIGGER_EVENTS } from "@lib/apiKeys/constants";
// import sendPayload from "@lib/apiKeys/sendPayload";
import { createProtectedRouter } from "@server/createRouter";
import { getTranslation } from "@server/lib/i18n";

export const apiKeysRouter = createProtectedRouter()
  .query("list", {
    async resolve({ ctx }) {
      return await ctx.prisma.apiKey.findMany({
        where: {
          userId: ctx.user.id,
        },
        orderBy: { createdAt: "desc" },
      });
    },
  })
  .mutation("create", {
    input: z.object({
      note: z.string().optional().nullish(),
      expiresAt: z.date().optional().nullable(),
    }),
    async resolve({ ctx, input }) {
      const [hashedApiKey, apiKey] = generateUniqueAPIKey();
      await ctx.prisma.apiKey.create({
        data: {
          id: v4(),
          userId: ctx.user.id,
          ...input,
          hashedKey: hashedApiKey,
        },
      });
      const prefixedApiKey = `${process.env.API_KEY_PREFIX ?? "pt_secret_"}${apiKey}`;
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
      const apiKey = await ctx.prisma.apiKey.findFirst({
        where: {
          userId: ctx.user.id,
          id,
        },
      });
      if (!apiKey) {
        // user does not own this apiKey
        return null;
      }
      return await ctx.prisma.apiKey.update({
        where: {
          id,
        },
        data,
      });
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

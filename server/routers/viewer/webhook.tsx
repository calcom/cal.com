import { v4 } from "uuid";
import { z } from "zod";

import { getErrorFromUnknown } from "@lib/errors";
import { WEBHOOK_TRIGGER_EVENTS } from "@lib/webhooks/constants";

import { createProtectedRouter } from "@server/createRouter";

export const webhookRouter = createProtectedRouter()
  .query("list", {
    async resolve({ ctx }) {
      return await ctx.prisma.webhook.findMany({
        where: {
          userId: ctx.user.id,
        },
      });
    },
  })
  .mutation("create", {
    input: z.object({
      subscriberUrl: z.string().url(),
      eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array(),
      active: z.boolean(),
    }),
    async resolve({ ctx, input }) {
      return await ctx.prisma.webhook.create({
        data: {
          id: v4(),
          userId: ctx.user.id,
          ...input,
        },
      });
    },
  })
  .mutation("edit", {
    input: z.object({
      id: z.string(),
      subscriberUrl: z.string().url().optional(),
      eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array().optional(),
      active: z.boolean().optional(),
    }),
    async resolve({ ctx, input }) {
      const { id, ...data } = input;
      const webhook = await ctx.prisma.webhook.findFirst({
        where: {
          userId: ctx.user.id,
          id,
        },
      });
      if (!webhook) {
        // user does not own this webhook
        return null;
      }
      return await ctx.prisma.webhook.update({
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
    }),
    async resolve({ ctx, input }) {
      const { id } = input;
      const webhook = await ctx.prisma.webhook.findFirst({
        where: {
          userId: ctx.user.id,
          id,
        },
      });
      if (!webhook) {
        // user does not own this webhook
        return null;
      }
      await ctx.prisma.webhook.delete({
        where: {
          id,
        },
      });
      return {
        id,
      };
    },
  })
  .mutation("testTrigger", {
    input: z.object({
      url: z.string().url(),
      type: z.string(),
    }),
    async resolve({ input }) {
      const { url, type } = input;

      const responseBodyMocks: Record<"PING", unknown> = {
        PING: {
          triggerEvent: "PING",
          createdAt: new Date().toISOString(),
          payload: {
            type: "Test",
            title: "Test trigger event",
            description: "",
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            organizer: {
              name: "Cal",
              email: "",
              timeZone: "Europe/London",
            },
          },
        },
      };

      const body = responseBodyMocks[type as "PING"];
      if (!body) {
        throw new Error(`Unknown type '${type}'`);
      }

      try {
        const res = await fetch(url, {
          method: "POST",
          // [...]
          body: JSON.stringify(body),
        });
        const text = await res.text();
        return {
          status: res.status,
          message: text,
        };
      } catch (_err) {
        const err = getErrorFromUnknown(_err);
        return {
          status: 500,
          message: err.message,
        };
      }
    },
  });

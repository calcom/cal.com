import { v4 } from "uuid";
import { z } from "zod";

import { getErrorFromUnknown } from "@lib/errors";
import { WEBHOOK_TRIGGER_EVENTS } from "@lib/webhooks/constants";
import sendPayload from "@lib/webhooks/sendPayload";

import { createProtectedRouter } from "@server/createRouter";
import { getTranslation } from "@server/lib/i18n";

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
      payloadTemplate: z.string().nullable(),
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

      await ctx.prisma.user.update({
        where: {
          id: ctx.user.id,
        },
        data: {
          webhooks: {
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
  })
  .mutation("testTrigger", {
    input: z.object({
      url: z.string().url(),
      type: z.string(),
      payloadTemplate: z.string().optional().nullable(),
    }),
    async resolve({ input }) {
      const { url, type, payloadTemplate } = input;
      const translation = await getTranslation("en", "common");
      const language = {
        locale: "en",
        translate: translation,
      };

      const data = {
        type: "Test",
        title: "Test trigger event",
        description: "",
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        attendees: [
          {
            email: "jdoe@example.com",
            name: "John Doe",
            timeZone: "Europe/London",
            language,
          },
        ],
        organizer: {
          name: "Cal",
          email: "",
          timeZone: "Europe/London",
          language,
        },
      };

      try {
        return await sendPayload(type, new Date().toISOString(), url, data, payloadTemplate);
      } catch (_err) {
        const error = getErrorFromUnknown(_err);
        return {
          ok: false,
          status: 500,
          message: error.message,
        };
      }
    },
  });

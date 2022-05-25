import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { z } from "zod";

import { getErrorFromUnknown } from "@calcom/lib/errors";

import { WEBHOOK_TRIGGER_EVENTS } from "@lib/webhooks/constants";
import sendPayload from "@lib/webhooks/sendPayload";

import { createProtectedRouter } from "@server/createRouter";
import { getTranslation } from "@server/lib/i18n";

export const webhookRouter = createProtectedRouter()
  .query("list", {
    input: z
      .object({
        eventTypeId: z.number().optional(),
      })
      .optional(),
    async resolve({ ctx, input }) {
      const where: Prisma.WebhookWhereInput = {
        AND: [{ appId: null /* Don't mixup zapier webhooks with normal ones */ }],
      };
      if (Array.isArray(where.AND)) {
        if (input?.eventTypeId) {
          where.AND?.push({ eventTypeId: input.eventTypeId });
        } else {
          where.AND?.push({ userId: ctx.user.id });
        }
      }
      return await ctx.prisma.webhook.findMany({
        where,
      });
    },
  })
  .mutation("create", {
    input: z.object({
      subscriberUrl: z.string().url(),
      eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array(),
      active: z.boolean(),
      payloadTemplate: z.string().nullable(),
      eventTypeId: z.number().optional(),
      appId: z.string().optional().nullable(),
    }),
    async resolve({ ctx, input: { eventTypeId, ...input } }) {
      const webhookCreateInput: Prisma.WebhookCreateInput = {
        id: v4(),
        ...input,
      };
      const webhookPayload = { webhooks: { create: webhookCreateInput } };
      let teamId = -1;
      if (eventTypeId) {
        /* [1] If an eventType is provided, we find the team were it belongs */
        const team = await ctx.prisma.team.findFirst({
          rejectOnNotFound: true,
          where: { eventTypes: { some: { id: eventTypeId } } },
          select: { id: true },
        });
        /* [2] We save the id for later use */
        teamId = team.id;
      }
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        /**
         * [3] Right now only team eventTypes can have webhooks so we make sure the
         * user adding the webhook belongs to the team.
         */
        data: eventTypeId
          ? {
              teams: {
                update: {
                  /* [3.1] Here we make sure the requesting user belongs to the team */
                  where: { userId_teamId: { teamId, userId: ctx.user.id } },
                  data: {
                    team: {
                      update: {
                        eventTypes: {
                          update: {
                            where: { id: eventTypeId },
                            data: webhookPayload,
                          },
                        },
                      },
                    },
                  },
                },
              },
            }
          : /* [4] If there's no eventTypeId we create it to the current user instead. */
            webhookPayload,
      });
      const webhook = await ctx.prisma.webhook.findUnique({
        rejectOnNotFound: true,
        where: { id: webhookCreateInput.id },
      });
      return webhook;
    },
  })
  .mutation("edit", {
    input: z.object({
      id: z.string(),
      subscriberUrl: z.string().url().optional(),
      eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array().optional(),
      active: z.boolean().optional(),
      payloadTemplate: z.string().nullable(),
      eventTypeId: z.number().optional(),
      appId: z.string().optional().nullable(),
    }),
    async resolve({ ctx, input }) {
      const { id, ...data } = input;
      const webhook = input.eventTypeId
        ? await ctx.prisma.webhook.findFirst({
            where: {
              eventTypeId: input.eventTypeId,
              id,
            },
          })
        : await ctx.prisma.webhook.findFirst({
            where: {
              userId: ctx.user.id,
              id,
            },
          });
      if (!webhook) {
        // user does not own this webhook
        // team event doesn't own this webhook
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
      eventTypeId: z.number().optional(),
    }),
    async resolve({ ctx, input }) {
      const { id } = input;

      input.eventTypeId
        ? await ctx.prisma.eventType.update({
            where: {
              id: input.eventTypeId,
            },
            data: {
              webhooks: {
                delete: {
                  id,
                },
              },
            },
          })
        : await ctx.prisma.user.update({
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
      const { url, type, payloadTemplate = null } = input;
      const translation = await getTranslation("en", "common");
      const language = {
        locale: "en",
        translate: translation,
      };

      const data = {
        triggerEvent: "PING",
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
          email: "no-reply@cal.com",
          timeZone: "Europe/London",
          language,
        },
      };

      try {
        const webhook = { subscriberUrl: url, payloadTemplate, appId: null };
        return await sendPayload(type, new Date().toISOString(), webhook, data);
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

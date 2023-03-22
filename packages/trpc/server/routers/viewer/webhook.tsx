import type { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { z } from "zod";

import { WEBHOOK_TRIGGER_EVENTS } from "@calcom/features/webhooks/lib/constants";
import sendPayload from "@calcom/features/webhooks/lib/sendPayload";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { getTranslation } from "@calcom/lib/server/i18n";

import { TRPCError } from "@trpc/server";

import { router, authedProcedure } from "../../trpc";

// Common data for all endpoints under webhook
const webhookIdAndEventTypeIdSchema = z.object({
  // Webhook ID
  id: z.string().optional(),
  // Event type ID
  eventTypeId: z.number().optional(),
});

const webhookProcedure = authedProcedure
  .input(webhookIdAndEventTypeIdSchema.optional())
  .use(async ({ ctx, input, next }) => {
    // Endpoints that just read the logged in user's data - like 'list' don't necessary have any input
    if (!input) return next();
    const { eventTypeId, id } = input;

    // A webhook is either linked to Event Type or to a user.
    if (eventTypeId) {
      const team = await ctx.prisma.team.findFirst({
        where: {
          eventTypes: {
            some: {
              id: eventTypeId,
            },
          },
        },
        include: {
          members: true,
        },
      });

      // Team should be available and the user should be a member of the team
      if (!team?.members.some((membership) => membership.userId === ctx.user.id)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      }
    } else if (id) {
      const authorizedHook = await ctx.prisma.webhook.findFirst({
        where: {
          id: id,
          userId: ctx.user.id,
        },
      });
      if (!authorizedHook) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      }
    }
    return next();
  });

export const webhookRouter = router({
  list: webhookProcedure
    .input(
      z
        .object({
          appId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.WebhookWhereInput = {
        /* Don't mixup zapier webhooks with normal ones */
        AND: [{ appId: !input?.appId ? null : input.appId }],
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
    }),
  get: webhookProcedure
    .input(
      z.object({
        webhookId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.webhook.findUniqueOrThrow({
        where: {
          id: input.webhookId,
        },
        select: {
          id: true,
          subscriberUrl: true,
          payloadTemplate: true,
          active: true,
          eventTriggers: true,
          secret: true,
        },
      });
    }),
  create: webhookProcedure
    .input(
      z.object({
        subscriberUrl: z.string().url(),
        eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array(),
        active: z.boolean(),
        payloadTemplate: z.string().nullable(),
        eventTypeId: z.number().optional(),
        appId: z.string().optional().nullable(),
        secret: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.eventTypeId) {
        return await ctx.prisma.webhook.create({
          data: {
            id: v4(),
            ...input,
          },
        });
      }

      return await ctx.prisma.webhook.create({
        data: {
          id: v4(),
          userId: ctx.user.id,
          ...input,
        },
      });
    }),
  edit: webhookProcedure
    .input(
      z.object({
        id: z.string(),
        subscriberUrl: z.string().url().optional(),
        eventTriggers: z.enum(WEBHOOK_TRIGGER_EVENTS).array().optional(),
        active: z.boolean().optional(),
        payloadTemplate: z.string().nullable(),
        eventTypeId: z.number().optional(),
        appId: z.string().optional().nullable(),
        secret: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
    }),
  delete: webhookProcedure
    .input(
      z.object({
        id: z.string(),
        eventTypeId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
    }),
  testTrigger: webhookProcedure
    .input(
      z.object({
        url: z.string().url(),
        type: z.string(),
        payloadTemplate: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { url, type, payloadTemplate = null } = input;
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
          email: "no-reply@cal.com",
          timeZone: "Europe/London",
          language,
        },
      };

      try {
        const webhook = { subscriberUrl: url, payloadTemplate, appId: null, secret: null };
        return await sendPayload(null, type, new Date().toISOString(), webhook, data);
      } catch (_err) {
        const error = getErrorFromUnknown(_err);
        return {
          ok: false,
          status: 500,
          message: error.message,
        };
      }
    }),
});

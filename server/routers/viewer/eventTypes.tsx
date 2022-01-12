import { MembershipRole, Prisma } from "@prisma/client";
import { EventTypeModel } from "prisma/zod";
import { z } from "zod";

import { WEBHOOK_TRIGGER_EVENTS } from "@lib/webhooks/constants";

import { createProtectedRouter } from "@server/createRouter";
import { TRPCError } from "@trpc/server";

export const eventTypesRouter = createProtectedRouter()
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
    input: EventTypeModel,
    async resolve({ ctx, input }) {
      const data: Prisma.EventTypeCreateInput | Prisma.EventTypeUpdateInput = input;
      console.log(`data`, data);
    },
  })
  // Prevent non-owners to update/delete a team event
  .middleware(async ({ ctx, rawInput, next }) => {
    const event = await ctx.prisma.eventType.findUnique({
      where: { id: (rawInput as Record<"id", number>)?.id },
      include: {
        users: true,
        team: {
          select: {
            members: {
              select: {
                userId: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const isAuthorized = (function () {
      if (event.team) {
        return event.team.members
          .filter((member) => member.role === MembershipRole.OWNER || member.role === MembershipRole.ADMIN)
          .map((member) => member.userId)
          .includes(ctx.user.id);
      }
      return event.userId === ctx.user.id || event.users.find((user) => user.id === ctx.user.id);
    })();

    if (!isAuthorized) {
      console.warn(`User ${ctx.user.id} attempted to an access an event ${event.id} they do not own.`);
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return next();
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
      return { id };
    },
  })
  .mutation("delete", {
    input: z.object({
      id: z.number(),
    }),
    async resolve({ ctx, input }) {
      const { id } = input;

      await ctx.prisma.eventTypeCustomInput.deleteMany({
        where: {
          eventTypeId: id,
        },
      });

      await ctx.prisma.eventType.delete({
        where: {
          id,
        },
      });

      return {
        id,
      };
    },
  });

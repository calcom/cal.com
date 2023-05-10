import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import { webhookIdAndEventTypeIdSchema } from "./types";

export const webhookProcedure = authedProcedure
  .input(webhookIdAndEventTypeIdSchema.optional())
  .use(async ({ ctx, input, next }) => {
    // Endpoints that just read the logged in user's data - like 'list' don't necessary have any input
    if (!input) return next();
    const { eventTypeId, id } = input;

    // A webhook is either linked to Event Type or to a user.
    if (eventTypeId) {
      const eventType = await prisma.eventType.findFirst({
        where: {
          id: eventTypeId,
        },
        include: {
          team: {
            include: {
              members: true,
            },
          },
        },
      });

      if (
        eventType &&
        eventType.userId !== ctx.user.id &&
        !eventType.team?.members.some((membership) => membership.userId === ctx.user.id)
      ) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      }
    } else if (id) {
      const authorizedHook = await prisma.webhook.findFirst({
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

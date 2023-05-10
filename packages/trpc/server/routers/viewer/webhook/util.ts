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
      const team = await prisma.team.findFirst({
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

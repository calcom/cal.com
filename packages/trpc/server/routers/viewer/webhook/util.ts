import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import { webhookIdAndEventTypeIdSchema } from "./types";

export const webhookProcedure = authedProcedure
  .input(webhookIdAndEventTypeIdSchema.optional())
  .use(async ({ ctx, input, next }) => {
    // Endpoints that just read the logged in user's data - like 'list' don't necessary have any input
    if (!input) return next();
    const { id } = input;

    const webhook = await prisma.webhook.findFirst({
      where: {
        id: id,
      },
      include: {
        user: true,
        team: true,
        eventType: true,
      },
    });

    if (webhook) {
      // A webhook is either linked to Event Type, to a user or to a team.
      if (webhook.teamId) {
        const user = await prisma.user.findFirst({
          where: {
            id: ctx.user.id,
          },
          include: {
            teams: true,
          },
        });

        if (
          user &&
          !user.teams.some(
            (membership) =>
              membership.teamId &&
              (membership.role === MembershipRole.ADMIN || membership.role === MembershipRole.OWNER)
          )
        ) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
          });
        }
      } else if (webhook.eventTypeId) {
        const eventType = await prisma.eventType.findFirst({
          where: {
            id: webhook.eventTypeId,
          },
          include: {
            team: {
              include: {
                members: true,
              },
            },
          },
        });

        if (eventType && eventType.userId !== ctx.user.id) {
          if (
            !eventType.team ||
            !eventType.team.members.some(
              (membership) =>
                membership.userId === ctx.user.id &&
                (membership.role === MembershipRole.ADMIN || membership.role === MembershipRole.OWNER)
            )
          ) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
            });
          }
        }
      } else if (webhook.userId && webhook.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      }
    } else {
      throw new TRPCError({
        code: "UNAUTHORIZED",
      });
    }
    return next();
  });

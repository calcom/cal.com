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
    const { id, teamId, eventTypeId } = input;

    if (id) {
      //check if user is authorized to edit webhook
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
        if (webhook.teamId) {
          const user = await prisma.user.findFirst({
            where: {
              id: ctx.user.id,
            },
            include: {
              teams: true,
            },
          });

          const userBelongsToTeam =
            user &&
            user.teams.some(
              (membership) =>
                membership.teamId === webhook.teamId &&
                (membership.role === MembershipRole.ADMIN || membership.role === MembershipRole.OWNER)
            );

          if (!userBelongsToTeam) {
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
            const userBelongsToTeam =
              eventType.team &&
              eventType.team.members.some(
                (membership) =>
                  membership.userId === ctx.user.id &&
                  (membership.role === MembershipRole.ADMIN || membership.role === MembershipRole.OWNER)
              );
            if (!userBelongsToTeam) {
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
      }
    } else {
      //check if user is authorized to create webhook on event type or team
      if (teamId) {
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
              membership.teamId === teamId &&
              (membership.role === MembershipRole.ADMIN || membership.role === MembershipRole.OWNER)
          )
        ) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
          });
        }
      } else if (eventTypeId) {
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

        if (eventType && eventType.userId !== ctx.user.id) {
          const userBelongsToTeam =
            eventType.team &&
            eventType.team.members.some(
              (membership) =>
                membership.userId === ctx.user.id &&
                (membership.role === MembershipRole.ADMIN || membership.role === MembershipRole.OWNER)
            );
          if (!userBelongsToTeam) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
            });
          }
        }
      }
    }

    return next();
  });

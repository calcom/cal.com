import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../../procedures/authedProcedure";
import { calidWebhookIdAndEventTypeIdSchema } from "./types";

/**
 * Custom webhook procedure for CalId teams and memberships
 * This handles authorization based on CalIdTeam and CalIdMembership instead of regular Team and Membership
 */
export const calidWebhookProcedure = authedProcedure
  .input(calidWebhookIdAndEventTypeIdSchema.optional())
  .use(async ({ ctx, input, next }) => {
    // Endpoints that just read the logged in user's data - like 'list' don't necessary have any input
    if (!input) return next();

    const { id, eventTypeId, calIdTeamId } = input;

    const assertPartOfCalIdTeamMembers = (
      memberships?: Array<{
        userId: number;
        role: string;
        acceptedInvitation: boolean;
      }>
    ) => {
      if (!memberships) return false;
      return memberships.some(
        (membership) =>
          membership.userId === ctx.user.id && (membership.role === "ADMIN" || membership.role === "OWNER")
      );
    };

    if (id) {
      // Check if user is authorized to edit webhook
      const webhook = await prisma.webhook.findUnique({
        where: {
          id: id,
        },
        include: {
          user: true,
          team: true,
          eventType: true,
          calIdTeam: true,
        },
      });

      if (webhook) {
        // Check CalId team authorization
        if (calIdTeamId && calIdTeamId !== webhook.calIdTeamId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Team ID mismatch",
          });
        }

        if (eventTypeId && eventTypeId !== webhook.eventTypeId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Event type ID mismatch",
          });
        }

        // Check CalId team membership
        if (webhook.calIdTeamId) {
          const user = await prisma.user.findUnique({
            where: {
              id: ctx.user.id,
            },
            include: {
              calIdTeams: {
                select: {
                  calIdTeamId: true,
                  role: true,
                  acceptedInvitation: true,
                },
              },
            },
          });

          const userHasAdminOwnerPermissionInCalIdTeam =
            user &&
            user.calIdTeams.some(
              (membership) =>
                membership.calIdTeamId === webhook.calIdTeamId &&
                membership.acceptedInvitation &&
                (membership.role === "ADMIN" || membership.role === "OWNER")
            );

          if (!userHasAdminOwnerPermissionInCalIdTeam) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "User does not have admin/owner permission in team",
            });
          }
        } else if (webhook.eventTypeId) {
          // Check event type authorization for CalId teams
          const eventType = await prisma.eventType.findUnique({
            where: {
              id: webhook.eventTypeId,
            },
            include: {
              calIdTeam: {
                include: {
                  members: {
                    select: {
                      userId: true,
                      role: true,
                      acceptedInvitation: true,
                    },
                  },
                },
              },
            },
          });

          if (eventType && eventType.userId !== ctx.user.id) {
            if (eventType.calIdTeam) {
              if (!assertPartOfCalIdTeamMembers(eventType.calIdTeam.members)) {
                throw new TRPCError({
                  code: "UNAUTHORIZED",
                  message: "User does not have required access level in team",
                });
              }
            } else {
              throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Event type not associated with team",
              });
            }
          }
        } else if (webhook.userId && webhook.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User does not own this webhook",
          });
        }
      }
    } else {
      // Check if user is authorized to create webhook on event type or CalId team
      if (calIdTeamId) {
        const user = await prisma.user.findUnique({
          where: {
            id: ctx.user.id,
          },
          include: {
            calIdTeams: {
              select: {
                calIdTeamId: true,
                role: true,
                acceptedInvitation: true,
              },
            },
          },
        });

        const userHasAccess = user?.calIdTeams.some(
          (membership) =>
            membership.calIdTeamId === calIdTeamId &&
            membership.acceptedInvitation &&
            (membership.role === "ADMIN" || membership.role === "OWNER")
        );

        if (!userHasAccess) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User does not have required access level in team",
          });
        }
      } else if (eventTypeId) {
        const eventType = await prisma.eventType.findUnique({
          where: {
            id: eventTypeId,
          },
          include: {
            calIdTeam: {
              include: {
                members: {
                  select: {
                    userId: true,
                    role: true,
                    acceptedInvitation: true,
                  },
                },
              },
            },
          },
        });

        if (eventType && eventType.userId !== ctx.user.id) {
          if (eventType.calIdTeam) {
            if (!assertPartOfCalIdTeamMembers(eventType.calIdTeam.members)) {
              throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "User does not have required access level in team",
              });
            }
          } else {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Event type not associated with team",
            });
          }
        }
      }
    }

    return next();
  });

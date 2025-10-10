import { prisma } from "@calcom/prisma";
import type {
  Booking,
  EventType,
  BookingReference,
  Attendee,
  Credential,
  DestinationCalendar,
  User,
} from "@calcom/prisma/client";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import { commonBookingSchema } from "./types";

export const bookingsProcedure = authedProcedure
  .input(commonBookingSchema)
  .use(async ({ ctx, input, next }) => {
    // Endpoints that just read the logged in user's data - like 'list' don't necessary have any input
    const { bookingId } = input;
    const loggedInUser = ctx.user;
    const bookingInclude = {
      attendees: true,
      eventType: {
        select: {
          id: true,
          title: true,
          teamId: true,
          hideOrganizerEmail: true,
          customReplyToEmail: true,
          seatsPerTimeSlot: true,
          seatsShowAttendees: true,
          recurringEvent: true,
          team: {
            select: {
              id: true,
              name: true,
              parentId: true,
              hideBranding: true,
              parent: {
                select: {
                  hideBranding: true,
                },
              },
            },
          },
          owner: {
            select: {
              id: true,
              hideBranding: true,
            },
          },
        },
      },
      destinationCalendar: true,
      references: true,
      user: {
        select: {
          name: true,
          email: true,
          timeZone: true,
          locale: true,
          destinationCalendar: true,
        },
      },
    };

    const bookingByBeingAdmin = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        eventType: {
          team: {
            members: {
              some: {
                userId: loggedInUser.id,
                role: {
                  in: [MembershipRole.ADMIN, MembershipRole.OWNER],
                },
              },
            },
          },
        },
      },
      include: bookingInclude,
    });

    if (!!bookingByBeingAdmin) {
      return next({ ctx: { booking: bookingByBeingAdmin } });
    }

    const bookingByBeingOrganizerOrCollectiveEventMember = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        AND: [
          {
            OR: [
              /* If user is organizer */
              { userId: ctx.user.id },
              /* Or part of a collective booking */
              {
                eventType: {
                  schedulingType: SchedulingType.COLLECTIVE,
                  users: {
                    some: {
                      id: ctx.user.id,
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      include: bookingInclude,
    });

    if (!bookingByBeingOrganizerOrCollectiveEventMember) throw new TRPCError({ code: "UNAUTHORIZED" });

    return next({ ctx: { booking: bookingByBeingOrganizerOrCollectiveEventMember } });
  });

export type BookingsProcedureContext = {
  booking: Booking & {
    eventType:
      | (EventType & {
          team?: {
            id: number;
            name: string;
            parentId?: number | null;
            hideBranding?: boolean | null;
            parent?: { hideBranding?: boolean | null } | null;
          } | null;
          owner?: { id: number; hideBranding?: boolean | null } | null;
        })
      | null;
    destinationCalendar: DestinationCalendar | null;
    user:
      | (User & {
          destinationCalendar: DestinationCalendar | null;
          credentials: Credential[];
        })
      | null;
    references: BookingReference[];
    attendees: Attendee[];
  };
};

import { prisma } from "@calcom/prisma";
import type {
  Attendee,
  Booking,
  BookingReference,
  Credential,
  DestinationCalendar,
  EventType,
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
        include: {
          team: {
            select: {
              id: true,
              name: true,
              parentId: true,
            },
          },
        },
      },
      destinationCalendar: true,
      references: true,
      user: {
        include: {
          destinationCalendar: true,
          credentials: true,
          profiles: {
            select: {
              organizationId: true,
            },
          },
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

    if (bookingByBeingAdmin) {
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
          team?: { id: number; name: string; parentId?: number | null } | null;
        })
      | null;
    destinationCalendar: DestinationCalendar | null;
    user:
      | (User & {
          destinationCalendar: DestinationCalendar | null;
          credentials: Credential[];
          profiles: { organizationId: number }[];
        })
      | null;
    references: BookingReference[];
    attendees: Attendee[];
  };
};

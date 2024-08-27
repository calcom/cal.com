import {
  MembershipRole,
  type Attendee,
  type Booking,
  type BookingReference,
  type Credential,
  type DestinationCalendar,
  type EventType,
  type User,
} from "@prisma/client";

import { prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import { commonBookingSchema } from "./types";

export const bookingsProcedure = authedProcedure
  .input(commonBookingSchema)
  .use(async ({ ctx, input, next }) => {
    // Endpoints that just read the logged in user's data - like 'list' don't necessary have any input
    const { bookingId } = input;
    const loggedInUser = ctx.user;

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
      include: {
        attendees: true,
        eventType: true,
        destinationCalendar: true,
        references: true,
        user: {
          include: {
            destinationCalendar: true,
            credentials: true,
          },
        },
      },
    });

    if (!bookingByBeingOrganizerOrCollectiveEventMember) throw new TRPCError({ code: "UNAUTHORIZED" });

    return next({ ctx: { booking: bookingByBeingOrganizerOrCollectiveEventMember } });
  });

export type BookingsProcedureContext = {
  booking: Booking & {
    eventType: EventType | null;
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

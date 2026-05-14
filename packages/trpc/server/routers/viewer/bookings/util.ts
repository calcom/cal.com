import { prisma } from "@calcom/prisma";
import type { Booking, BookingReference, Attendee } from "@calcom/prisma/client";
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
          slug: true,
          team: {
            select: {
              id: true,
              name: true,
              parentId: true,
            },
          },
        },
      },
      destinationCalendar: {
        select: {
          id: true,
          integration: true,
          externalId: true,
        },
      },
      references: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          timeZone: true,
          destinationCalendar: {
            select: {
              id: true,
              integration: true,
              externalId: true,
            },
          },
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
    eventType: {
      id: number;
      title: string;
      slug: string;
      team?: { id: number; name: string; parentId?: number | null } | null;
    } | null;
    destinationCalendar: { id: number; integration: string; externalId: string } | null;
    user: {
      id: number;
      name: string | null;
      email: string;
      username: string | null;
      timeZone: string | null;
      destinationCalendar: { id: number; integration: string; externalId: string } | null;
      profiles: { organizationId: number }[];
    } | null;
    references: BookingReference[];
    attendees: Attendee[];
  };
};

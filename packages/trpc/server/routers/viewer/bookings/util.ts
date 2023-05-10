import type {
  Attendee,
  Booking,
  BookingReference,
  Credential,
  DestinationCalendar,
  EventType,
  User,
} from "@prisma/client";

import { prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import { authedProcedure } from "../../../trpc";
import { commonBookingSchema } from "./types";

export const bookingsProcedure = authedProcedure
  .input(commonBookingSchema)
  .use(async ({ ctx, input, next }) => {
    // Endpoints that just read the logged in user's data - like 'list' don't necessary have any input
    const { bookingId } = input;

    const booking = await prisma.booking.findFirst({
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

    if (!booking) throw new TRPCError({ code: "UNAUTHORIZED" });

    return next({ ctx: { booking } });
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

import type { User } from "@prisma/client";
import { z } from "zod";

import { bookingConfirmPatchBodySchema } from "@calcom/prisma/zod-utils";
import type { AdditionalInformation, CalendarEvent } from "@calcom/types/Calendar";

import { TRPCError } from "@trpc/server";

import { authedProcedure, router } from "../../../trpc";
import { editLocationSchema } from "./schemas/editLocationSchema";
import { getSchema } from "./schemas/getSchema";
import { requestRescheduleSchema } from "./schemas/requestRescheduleSchema";

export type PersonAttendeeCommonFields = Pick<
  User,
  "id" | "email" | "name" | "locale" | "timeZone" | "username"
>;

// Common data for all endpoints under webhook
const commonBookingSchema = z.object({
  bookingId: z.number(),
});

const bookingsProcedure = authedProcedure.input(commonBookingSchema).use(async ({ ctx, input, next }) => {
  // Endpoints that just read the logged in user's data - like 'list' don't necessary have any input
  const { bookingId } = input;
  const { SchedulingType } = await import("@prisma/client");
  const booking = await ctx.prisma.booking.findFirst({
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

export const bookingsRouter = router({
  get: authedProcedure.input(getSchema).query(async (opt) => {
    const { get } = await import("./get");
    return get(opt);
  }),
  requestReschedule: authedProcedure.input(requestRescheduleSchema).mutation(async (opt) => {
    const { requestReschedule } = await import("./requestReschedule");
    return requestReschedule(opt);
  }),
  editLocation: bookingsProcedure.input(editLocationSchema).mutation(async ({ ctx, input }) => {
    const { sendLocationChangeEmails } = await import("@calcom/emails");
    const { parseRecurringEvent } = await import("@calcom/lib");
    const logger = (await import("@calcom/lib/logger")).default;
    const dayjs = (await import("@calcom/dayjs")).default;

    const { bookingId, newLocation: location } = input;
    const { booking } = ctx;

    try {
      const organizer = await ctx.prisma.user.findFirstOrThrow({
        where: {
          id: booking.userId || 0,
        },
        select: {
          name: true,
          email: true,
          timeZone: true,
          locale: true,
        },
      });
      const { getTranslation } = await import("@calcom/lib/server");
      const tOrganizer = await getTranslation(organizer.locale ?? "en", "common");

      const attendeesListPromises = booking.attendees.map(async (attendee) => {
        return {
          name: attendee.name,
          email: attendee.email,
          timeZone: attendee.timeZone,
          language: {
            translate: await getTranslation(attendee.locale ?? "en", "common"),
            locale: attendee.locale ?? "en",
          },
        };
      });

      const attendeesList = await Promise.all(attendeesListPromises);

      const evt: CalendarEvent = {
        title: booking.title || "",
        type: (booking.eventType?.title as string) || booking?.title || "",
        description: booking.description || "",
        startTime: booking.startTime ? dayjs(booking.startTime).format() : "",
        endTime: booking.endTime ? dayjs(booking.endTime).format() : "",
        organizer: {
          email: organizer.email,
          name: organizer.name ?? "Nameless",
          timeZone: organizer.timeZone,
          language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
        },
        attendees: attendeesList,
        uid: booking.uid,
        recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
        location,
        destinationCalendar: booking?.destinationCalendar || booking?.user?.destinationCalendar,
      };
      const EventManager = (await import("@calcom/core/EventManager")).default;
      const eventManager = new EventManager(ctx.user);

      const updatedResult = await eventManager.updateLocation(evt, booking);
      const results = updatedResult.results;
      if (results.length > 0 && results.every((res) => !res.success)) {
        const error = {
          errorCode: "BookingUpdateLocationFailed",
          message: "Updating location failed",
        };
        logger.error(`Booking ${ctx.user.username} failed`, error, results);
      } else {
        await ctx.prisma.booking.update({
          where: {
            id: bookingId,
          },
          data: {
            location,
            references: {
              create: updatedResult.referencesToCreate,
            },
          },
        });

        const metadata: AdditionalInformation = {};
        if (results.length) {
          metadata.hangoutLink = results[0].updatedEvent?.hangoutLink;
          metadata.conferenceData = results[0].updatedEvent?.conferenceData;
          metadata.entryPoints = results[0].updatedEvent?.entryPoints;
        }
        try {
          await sendLocationChangeEmails({ ...evt, additionalInformation: metadata });
        } catch (error) {
          console.log("Error sending LocationChangeEmails");
        }
      }
    } catch {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
    return { message: "Location updated" };
  }),
  confirm: bookingsProcedure.input(bookingConfirmPatchBodySchema).mutation(async (opt) => {
    const { confirm } = await import("./confirm");
    return confirm(opt);
  }),
  getBookingAttendees: authedProcedure
    .input(z.object({ seatReferenceUid: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const bookingSeat = await ctx.prisma.bookingSeat.findUniqueOrThrow({
        where: {
          referenceUid: input.seatReferenceUid,
        },
        select: {
          booking: {
            select: {
              _count: {
                select: {
                  seatsReferences: true,
                },
              },
            },
          },
        },
      });

      if (!bookingSeat) {
        throw new Error("Booking not found");
      }
      return bookingSeat.booking._count.seatsReferences;
    }),
});

// This file is assumed to be part of an existing tRPC router.
// Add the new `getRescheduleAvailability` query to the `bookingsRouter`.

// (Existing imports)
import { protectedProcedure, createTRPCRouter } from "@calcom/trpc/server/trpc";
import { z } from "zod";
import { getReschedulingAvailableSlots } from "@calcom/trpc/src/utils/rescheduling-availability"; // Correct path to utility
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

// Assuming existing router definition structure.
// This example assumes `bookingsRouter` is defined and exported like this:
export const bookingsRouter = createTRPCRouter({
  // ... (other existing mutations/queries in bookingsRouter)

  /**
   * Fetches available slots for rescheduling a booking,
   * taking into account both the host's and the guest's availability.
   * If the guest is a Cal.com user, only slots free for both are returned.
   * If the guest is not a Cal.com user, only host's availability is returned.
   */
  getRescheduleAvailability: protectedProcedure
    .input(
      z.object({
        bookingId: z.number(),
        dateFrom: z.string().datetime(), // ISO string for the start of the desired search range
        dateTo: z.string().datetime(), // ISO string for the end of the desired search range
      })
    )
    .query(async ({ ctx, input }) => {
      const { bookingId, dateFrom, dateTo } = input;

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          uid: true,
          userId: true, // This is the Host User ID
          eventTypeId: true,
          attendees: {
            select: {
              email: true,
              name: true,
              timeZone: true,
            },
          },
        },
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found.",
        });
      }

      const hostUserId = booking.userId;

      // Identify the guest email. In Cal.com, the primary guest is usually
      // one of the attendees, excluding the host themselves.
      // If there are multiple guests, this logic might need refinement based on Cal.com's specific UX for rescheduling.
      // For this bounty, we assume a single primary guest or fall back to host-only if no distinct guest found.
      const host = await prisma.user.findUnique({
        where: { id: hostUserId },
        select: { email: true },
      });

      if (!host) {
        // This case should ideally not happen if booking.userId is valid
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Host user not found for the booking.",
        });
      }

      // Filter out the host's email from attendees to get the guest(s)
      const guestAttendees = booking.attendees.filter(
        (attendee) => attendee.email !== host.email
      );

      // For simplicity, we'll take the first guest's email.
      // If no distinct guest is found, `guestEmail` will be an empty string,
      // which `getReschedulingAvailableSlots` will handle by treating them as a non-Cal.com user.
      const guestEmail = guestAttendees.length > 0 ? guestAttendees[0].email : "";

      const eventType = await prisma.eventType.findUnique({
        where: { id: booking.eventTypeId },
      });

      if (!eventType) {
        throw new TRPCError({
          code: "NOT_FOU`ND",
          message: "Event type not found for the booking.",
        });
      }

      // The timeZone for availability calculation should typically be the eventType's timeZone,
      // as this dictates the schedule of the event.
      const calculationTimeZone = eventType.timeZone;

      const availableSlots = await getReschedulingAvailableSlots({
        hostUserId,
        guestEmail,
        eventType, // Pass the full eventType object
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
        timeZone: calculationTimeZone,
      });

      return availableSlots;
    }),

  // ... (rest of bookingsRouter)
});
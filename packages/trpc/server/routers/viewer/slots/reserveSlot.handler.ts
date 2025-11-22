import { serialize } from "cookie";
import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuid } from "uuid";

import dayjs from "@calcom/dayjs";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { MINUTES_TO_BOOK } from "@calcom/lib/constants";
import { PrismaSelectedSlotRepository } from "@calcom/lib/server/repository/PrismaSelectedSlotRepository";
import type { PrismaClient } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TReserveSlotInputSchema } from "./reserveSlot.schema";

interface ReserveSlotOptions {
  ctx: {
    prisma: PrismaClient;
    req?: NextApiRequest | undefined;
    res?: NextApiResponse | undefined;
  };
  input: TReserveSlotInputSchema;
}
export const reserveSlotHandler = async ({ ctx, input }: ReserveSlotOptions) => {
  const { prisma, req, res } = ctx;
  const uid = req?.cookies?.uid || uuid();

  const { slotUtcStartDate, slotUtcEndDate, eventTypeId, _isDryRun } = input;
  const releaseAt = dayjs.utc().add(parseInt(MINUTES_TO_BOOK), "minutes").format();
  const eventType = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
    select: { users: { select: { id: true } }, seatsPerTimeSlot: true },
  });

  if (!eventType) {
    throw new TRPCError({
      message: "Event type not found",
      code: "NOT_FOUND",
    });
  }

  let shouldReserveSlot = true;

  // If this is a seated event then don't reserve a slot
  if (eventType.seatsPerTimeSlot) {
    // Check to see if this is the last attendee
    const bookingWithAttendees = await prisma.booking.findFirst({
      where: {
        eventTypeId,
        startTime: slotUtcStartDate,
        endTime: slotUtcEndDate,
        status: BookingStatus.ACCEPTED,
      },
      select: { attendees: true },
    });
    const bookingAttendeesLength = bookingWithAttendees?.attendees?.length;
    if (bookingAttendeesLength) {
      const seatsLeft = eventType.seatsPerTimeSlot - bookingAttendeesLength;
      if (seatsLeft < 1) shouldReserveSlot = false;
    } else {
      // If there is no booking yet then don't reserve the slot
      shouldReserveSlot = false;
    }
  }

  // Check for existing reservations for the same slot
  const slotsRepo = new PrismaSelectedSlotRepository(prisma);
  const reservedBySomeoneElse = await slotsRepo.findReservedByOthers({
    slot: {
      utcStartIso: slotUtcStartDate,
      utcEndIso: slotUtcEndDate,
    },
    eventTypeId,
    uid,
  });

  if (eventType && shouldReserveSlot && !reservedBySomeoneElse && !_isDryRun) {
    try {
      // Get the event type details to check scheduling type
      const eventTypeDetails = await prisma.eventType.findUnique({
        where: { id: eventTypeId },
        select: { schedulingType: true },
      });

      if (eventTypeDetails?.schedulingType === "ROUND_ROBIN") {
        // Atomic operation: Create reservation first, then check capacity
        await prisma.selectedSlots.upsert({
          where: { selectedSlotUnique: { userId: -1, slotUtcStartDate, slotUtcEndDate, uid } },
          update: {
            slotUtcStartDate,
            slotUtcEndDate,
            releaseAt,
            eventTypeId,
          },
          create: {
            userId: -1, // Generic reservation for Round-Robin
            eventTypeId,
            slotUtcStartDate,
            slotUtcEndDate,
            uid,
            releaseAt,
            isSeat: eventType.seatsPerTimeSlot !== null,
          },
        });

        // Check capacity after creation to handle race conditions
        const totalReservations = await prisma.selectedSlots.count({
          where: {
            slotUtcStartDate,
            slotUtcEndDate,
            userId: -1,
            releaseAt: { gt: new Date() },
          },
        });
        
        if (totalReservations > eventType.users.length) {
          // Rollback: Delete the reservation we just created
          await prisma.selectedSlots.delete({
            where: { selectedSlotUnique: { userId: -1, slotUtcStartDate, slotUtcEndDate, uid } },
          });
          throw new TRPCError({
            message: "Slot is fully booked",
            code: "BAD_REQUEST",
          });
        }
      } else {
        // For other scheduling types, create reservations for all users
        await Promise.all(
          eventType.users.map((user) =>
            prisma.selectedSlots.upsert({
              where: { selectedSlotUnique: { userId: user.id, slotUtcStartDate, slotUtcEndDate, uid } },
              update: {
                slotUtcStartDate,
                slotUtcEndDate,
                releaseAt,
                eventTypeId,
              },
              create: {
                userId: user.id,
                eventTypeId,
                slotUtcStartDate,
                slotUtcEndDate,
                uid,
                releaseAt,
                isSeat: eventType.seatsPerTimeSlot !== null,
              },
            })
          )
        );
      }
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        message: "Failed to reserve slot",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  }
  // We need this cookie to be accessible from embeds where the booking flow is displayed within an iframe on a different origin.
  // For third‑party iframe contexts (embeds on other sites), browsers require SameSite=None and Secure to make the cookie available.
  // For local development on http://localhost we fall back to SameSite=Lax to avoid requiring https during development.
  const useSecureCookies = WEBAPP_URL.startsWith("https://");
  res?.setHeader(
    "Set-Cookie",
    serialize("uid", uid, {
      path: "/",
      sameSite: useSecureCookies ? "none" : "lax",
      secure: useSecureCookies,
    })
  );
  return {
    uid: uid,
  };
};

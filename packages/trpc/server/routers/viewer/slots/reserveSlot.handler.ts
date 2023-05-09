import { serialize } from "cookie";
import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuid } from "uuid";

import dayjs from "@calcom/dayjs";
import { MINUTES_TO_BOOK } from "@calcom/lib/constants";
import type { PrismaClient } from "@calcom/prisma/client";

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
  const { slotUtcStartDate, slotUtcEndDate, eventTypeId, bookingAttendees } = input;
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
    if (bookingAttendees) {
      const seatsLeft = eventType.seatsPerTimeSlot - bookingAttendees;
      if (seatsLeft < 1) shouldReserveSlot = false;
    } else {
      // If there is no booking yet then don't reserve the slot
      shouldReserveSlot = false;
    }
  }

  if (eventType && shouldReserveSlot) {
    try {
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
    } catch {
      throw new TRPCError({
        message: "Event type not found",
        code: "NOT_FOUND",
      });
    }
  }
  res?.setHeader("Set-Cookie", serialize("uid", uid, { path: "/", sameSite: "lax" }));
  return;
};

import { serialize } from "cookie";
import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuid } from "uuid";

import dayjs from "@calcom/dayjs";
import { MINUTES_TO_BOOK } from "@calcom/lib/constants";
import { SelectedSlotsRepository } from "@calcom/lib/server/repository/selectedSlots";
import type { PrismaClient } from "@calcom/prisma";

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
  const { slotUtcStartDate, slotUtcEndDate, eventTypeId, bookingUid, _isDryRun } = input;
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
      where: { uid: bookingUid },
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
  const reservedBySomeoneElse = await SelectedSlotsRepository.findReservedByOthers({
    slot: {
      utcStartIso: slotUtcStartDate,
      utcEndIso: slotUtcEndDate,
    },
    eventTypeId,
    uid,
  });

  if (eventType && shouldReserveSlot && !reservedBySomeoneElse && !_isDryRun) {
    try {
      await Promise.all(
        // FIXME: In case of team event, users doesn't have assignees, those are in hosts. users just have the creator of the event which is wrong.
        // Also, we must not block all the users' slots, we must use routedTeamMemberIds if set like we do in getSchedule.
        // We could even improve it by identifying the next person being booked now that we have a queue of assignees.
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
  return {
    uid: uid,
  };
};

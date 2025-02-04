import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { getPastTimeAndMinimumBookingNoticeBoundsStatus } from "@calcom/lib/isOutOfBounds";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import { SelectedSlotsRepository } from "@calcom/lib/server/repository/selectedSlots";
import type { PrismaClient } from "@calcom/prisma";

import type { TIsAvailableInputSchema, TIsAvailableOutputSchema } from "./isAvailable.schema";

interface IsAvailableOptions {
  ctx: {
    prisma: PrismaClient;
    req?: NextApiRequest | undefined;
  };
  input: TIsAvailableInputSchema;
}

/**
 * It does a super quick check whether that slot is bookable or not.
 * It doesn't consider slow things like querying the bookings, checking the calendars.
 *
 * getSchedule call is the only(but very slow) way to know if a slot is bookable
 */
export const isAvailableHandler = async ({
  ctx,
  input,
}: IsAvailableOptions): Promise<TIsAvailableOutputSchema> => {
  const { req } = ctx;
  const uid = req?.cookies?.uid;

  const { slots, eventTypeId } = input;

  // Get event type details for time bounds validation
  const eventType = await EventTypeRepository.findByIdMinimal({ id: eventTypeId });

  if (!eventType) {
    throw new HttpError({ statusCode: 404, message: "Event type not found" });
  }

  // Check each slot's availability
  // Without uid, we must not check for reserved slots because if uuid isn't set in cookie yet, but it is going to be through reserveSlot request soon, we could consider the slot as reserved accidentally.
  const reservedSlots = uid
    ? await SelectedSlotsRepository.findManyReservedByOthers(slots, eventTypeId, uid)
    : [];

  // Map all slots to their availability status
  const slotsWithStatus: TIsAvailableOutputSchema["slots"] = slots.map((slot) => {
    const isReserved = reservedSlots.some(
      (reservedSlot) =>
        reservedSlot.slotUtcStartDate.toISOString() === slot.utcStartIso &&
        reservedSlot.slotUtcEndDate.toISOString() === slot.utcEndIso
    );

    if (isReserved) {
      return {
        ...slot,
        status: "reserved" as const,
      };
    }

    // Check time bounds
    const timeStatus = getPastTimeAndMinimumBookingNoticeBoundsStatus({
      time: slot.utcStartIso,
      minimumBookingNotice: eventType.minimumBookingNotice,
    });

    return {
      ...slot,
      status: timeStatus.reason ?? "available",
    };
  });

  return {
    slots: slotsWithStatus,
  };
};

import type { NextApiRequest } from "next";

import { SelectedSlotsRepository } from "@calcom/lib/server/repository/selectedSlots";
import type { PrismaClient } from "@calcom/prisma";

import type { TIsReservedInputSchema } from "./isAvailable.schema";

interface IsReservedOptions {
  ctx: {
    prisma: PrismaClient;
    req?: NextApiRequest | undefined;
  };
  input: TIsReservedInputSchema;
}

type SlotQuickCheckStatus = "available" | "reserved";

/**
 * It does a super quick check whether that slot is bookable or not.
 * It doesn't consider slow things like querying the bookings, checking the calendars.
 *
 * getSchedule call is the only(but very slow) way to know if a slot is bookable
 */
export const isAvailableHandler = async ({ ctx, input }: IsReservedOptions) => {
  const { req } = ctx;
  const uid = req?.cookies?.uid;

  const { slots, eventTypeId } = input;

  // Check each slot's availability
  const reservedSlots = await SelectedSlotsRepository.findManyReservedByOthers(slots, eventTypeId, uid);

  // Map all slots to their availability status
  const slotsWithStatus = slots.map((slot) => {
    const isReserved = reservedSlots.some(
      (reservedSlot) =>
        reservedSlot.slotUtcStartDate.toISOString() === slot.utcStartIso &&
        reservedSlot.slotUtcEndDate.toISOString() === slot.utcEndIso
    );

    const status: SlotQuickCheckStatus = isReserved ? "reserved" : "available";
    return {
      ...slot,
      status,
    };
  });

  return {
    slots: slotsWithStatus,
  };
};

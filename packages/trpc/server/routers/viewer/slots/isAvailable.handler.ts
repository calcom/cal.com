import type { NextApiRequest } from "next";

import type { PrismaClient } from "@calcom/prisma";

import type { TIsReservedInputSchema } from "./isAvailable.schema";

interface IsReservedOptions {
  ctx: {
    prisma: PrismaClient;
    req?: NextApiRequest | undefined;
  };
  input: TIsReservedInputSchema;
}

export const isAvailableHandler = async ({ ctx, input }: IsReservedOptions) => {
  const { prisma, req } = ctx;
  const uid = req?.cookies?.uid;

  const { slots, eventTypeId } = input;

  // Check each slot's availability
  // TODO: Move to SelectedSlots repository
  const reservedSlots = await prisma.selectedSlots.findMany({
    where: {
      OR: slots.map((slot) => ({
        slotUtcStartDate: slot.slotUtcStartDate,
        slotUtcEndDate: slot.slotUtcEndDate,
        eventTypeId,
        uid: { not: uid }, // Exclude current user's reservation
        releaseAt: { gt: new Date() }, // Only consider non-expired reservations
      })),
    },
    select: {
      slotUtcStartDate: true,
      slotUtcEndDate: true,
    },
  });

  // Map all slots to their availability status
  const slotsWithStatus = slots.map((slot) => {
    const isReserved = reservedSlots.some(
      (reservedSlot) =>
        reservedSlot.slotUtcStartDate.toISOString() === slot.slotUtcStartDate &&
        reservedSlot.slotUtcEndDate.toISOString() === slot.slotUtcEndDate
    );

    const status: "available" | "reserved" = isReserved ? "reserved" : "available";
    return {
      slotUtcStartDate: slot.slotUtcStartDate,
      slotUtcEndDate: slot.slotUtcEndDate,
      status,
    };
  });

  return {
    slots: slotsWithStatus,
  };
};

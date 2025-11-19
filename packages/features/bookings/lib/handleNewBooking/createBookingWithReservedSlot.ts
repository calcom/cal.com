import type { PrismaClient } from "@calcom/prisma";

import { ensureReservedSlotIsEarliest } from "../reservations/validateReservedSlot";
import { createBooking } from "./createBooking";
import type { CreateBookingParams } from "./createBooking";

type ReservedSlot = {
  eventTypeId: number;
  slotUtcStart: Date;
  slotUtcEnd: Date;
  reservedSlotUid: string;
};

export async function createBookingWithReservedSlot(
  prismaClient: PrismaClient,
  args: CreateBookingParams & { rescheduledBy: string | undefined },
  reservedSlot: ReservedSlot
) {
  return prismaClient.$transaction(async (tx) => {
    await ensureReservedSlotIsEarliest(tx, reservedSlot);
    const booking = await createBooking(args, { tx });

    await tx.selectedSlots.deleteMany({
      where: {
        eventTypeId: reservedSlot.eventTypeId,
        slotUtcStartDate: reservedSlot.slotUtcStart,
        slotUtcEndDate: reservedSlot.slotUtcEnd,
        uid: reservedSlot.reservedSlotUid,
      },
    });

    return booking;
  });
}

import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import { ensureReservedSlotIsEarliest } from "../reservations/validateReservedSlot";

export type ReservedSlotMeta = {
  eventTypeId: number;
  slotUtcStart: Date;
  slotUtcEnd: Date;
  reservedSlotUid: string;
};

export async function createInstantBookingWithReservedSlot(
  createArgs: Prisma.BookingCreateArgs,
  reservedSlot: ReservedSlotMeta
) {
  return prisma.$transaction(async (tx) => {
    await ensureReservedSlotIsEarliest(tx, reservedSlot);

    const booking = await tx.booking.create(createArgs);

    const slotUtcStartDate =
      typeof reservedSlot.slotUtcStart === "string"
        ? new Date(dayjs(reservedSlot.slotUtcStart).utc().format())
        : reservedSlot.slotUtcStart;
    const slotUtcEndDate =
      typeof reservedSlot.slotUtcEnd === "string"
        ? new Date(dayjs(reservedSlot.slotUtcEnd).utc().format())
        : reservedSlot.slotUtcEnd;

    await tx.selectedSlots.deleteMany({
      where: {
        eventTypeId: reservedSlot.eventTypeId,
        slotUtcStartDate,
        slotUtcEndDate,
        uid: reservedSlot.reservedSlotUid,
      },
    });

    return booking;
  });
}

import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";

import { ensureReservedSlotIsEarliest } from "../reservations/validateReservedSlot";
import { createBooking } from "./createBooking";
import type { CreateBookingParams } from "./createBooking";

type ReservedSlot = {
  eventTypeId: number;
  slotUtcStart: string | Date;
  slotUtcEnd: string | Date;
  reservedSlotUid: string;
};

export async function createBookingWithReservedSlot(
  args: CreateBookingParams & { rescheduledBy: string | undefined },
  reservedSlot: ReservedSlot
) {
  return prisma.$transaction(async (tx) => {
    await ensureReservedSlotIsEarliest(tx, reservedSlot);
    const booking = await createBooking(args, { tx });

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

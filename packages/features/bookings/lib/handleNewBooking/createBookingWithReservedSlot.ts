import dayjs from "@calcom/dayjs";
import { HttpError } from "@calcom/lib/http-error";
import type { PrismaSelectedSlotRepository } from "@calcom/lib/server/repository/PrismaSelectedSlotRepository";
import type { PrismaClient } from "@calcom/prisma";

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
  selectedSlotsRepository: PrismaSelectedSlotRepository,
  args: CreateBookingParams & { rescheduledBy: string | undefined },
  reservedSlot: ReservedSlot
) {
  return prismaClient.$transaction(async (tx) => {
    const earliestActive = await selectedSlotsRepository.findEarliestActiveSlot(reservedSlot, tx);

    if (earliestActive && earliestActive.uid !== reservedSlot.reservedSlotUid) {
      const now = dayjs.utc().toDate();
      const secondsUntilRelease = dayjs(earliestActive.releaseAt).diff(now, "second");
      throw new HttpError({
        statusCode: 409,
        message: "reserved_slot_not_first_in_line",
        data: { secondsUntilRelease },
      });
    }

    const booking = await createBooking(args, { tx });

    await selectedSlotsRepository.deleteForEvent(reservedSlot, tx);

    return booking;
  });
}

import dayjs from "@calcom/dayjs";
import { MINUTES_TO_BOOK } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export type ReservationConsumption = {
  eventTypeId: number;
  slotUtcStartDate: Date;
  slotUtcEndDate: Date;
  reservedSlotUid: string;
};

export async function ensureReservedSlotIsEarliest(
  prisma: PrismaClient | Prisma.TransactionClient,
  params: {
    eventTypeId: number;
    slotUtcStart: string | Date;
    slotUtcEnd: string | Date;
    reservedSlotUid: string;
  }
): Promise<ReservationConsumption> {
  const { eventTypeId, reservedSlotUid } = params;
  const slotUtcStartDate =
    typeof params.slotUtcStart === "string"
      ? new Date(dayjs(params.slotUtcStart).utc().format())
      : params.slotUtcStart;
  const slotUtcEndDate =
    typeof params.slotUtcEnd === "string"
      ? new Date(dayjs(params.slotUtcEnd).utc().format())
      : params.slotUtcEnd;

  const now = new Date();

  const reservedSlot = await prisma.selectedSlots.findFirst({
    where: {
      eventTypeId,
      slotUtcStartDate,
      slotUtcEndDate,
      uid: reservedSlotUid,
      releaseAt: { gt: now },
    },
    select: { id: true },
  });

  if (!reservedSlot) {
    throw new HttpError({ statusCode: 410, message: "reservation_not_found_or_expired" });
  }

  const earliestActive = await prisma.selectedSlots.findFirst({
    where: {
      eventTypeId,
      slotUtcStartDate,
      slotUtcEndDate,
      releaseAt: { gt: now },
    },
    orderBy: [{ releaseAt: "asc" }, { id: "asc" }],
    select: { uid: true, releaseAt: true },
  });

  if (!earliestActive || earliestActive.uid !== reservedSlotUid) {
    const defaultSecondsUntilRelease = parseInt(MINUTES_TO_BOOK) * 60;
    const secondsUntilRelease = earliestActive 
      ? Math.max(0, Math.ceil((earliestActive.releaseAt.getTime() - now.getTime()) / 1000))
      : defaultSecondsUntilRelease;
    throw new HttpError({ 
      statusCode: 409, 
      message: "reserved_slot_not_first_in_line",
      data: { secondsUntilRelease }
    }); 
  }

  return { eventTypeId, slotUtcStartDate, slotUtcEndDate, reservedSlotUid };
}

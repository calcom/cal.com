import dayjs from "@calcom/dayjs";
import { HttpError } from "@calcom/lib/http-error";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export async function ensureReservedSlotIsEarliest(
  prisma: PrismaClient | Prisma.TransactionClient,
  params: {
    eventTypeId: number;
    slotUtcStart: Date;
    slotUtcEnd: Date;
    reservedSlotUid: string;
  }
) {
  const { eventTypeId, reservedSlotUid } = params;

  const now = dayjs.utc().toDate();

  const earliestActive = await prisma.selectedSlots.findFirst({
    where: {
      eventTypeId,
      slotUtcStartDate: params.slotUtcStart,
      slotUtcEndDate: params.slotUtcEnd,
      releaseAt: { gt: now },
    },
    orderBy: [{ releaseAt: "asc" }, { id: "asc" }],
    select: { uid: true, releaseAt: true },
  });

  if (earliestActive && earliestActive.uid !== reservedSlotUid) {
    const secondsUntilRelease = dayjs(earliestActive.releaseAt).diff(now, "second");
    throw new HttpError({
      statusCode: 409,
      message: "reserved_slot_not_first_in_line",
      data: { secondsUntilRelease },
    });
  }
}

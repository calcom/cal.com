import dayjs from "@calcom/dayjs";
import type { GetAvailabilityUser } from "@calcom/lib/getUserAvailability";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

const selectSelectedSlots = Prisma.validator<Prisma.SelectedSlotsDefaultArgs>()({
  select: {
    id: true,
    slotUtcStartDate: true,
    slotUtcEndDate: true,
    userId: true,
    isSeat: true,
    eventTypeId: true,
    uid: true,
  },
});

export type SelectedSlots = Prisma.SelectedSlotsGetPayload<typeof selectSelectedSlots>;

export class ReservedSlotHandler {
  /**
   * Gets reserved slots and cleans up expired ones
   */
  public async getReservedSlotsAndCleanupExpired({
    bookerClientUid,
    usersWithCredentials,
    eventTypeId,
  }: {
    bookerClientUid: string | undefined;
    usersWithCredentials: GetAvailabilityUser[];
    eventTypeId: number;
  }): Promise<SelectedSlots[]> {
    const currentTimeInUtc = dayjs.utc().format();

    const unexpiredSelectedSlots =
      (await prisma.selectedSlots.findMany({
        where: {
          userId: { in: usersWithCredentials.map((user) => user.id) },
          releaseAt: { gt: currentTimeInUtc },
        },
        ...selectSelectedSlots,
      })) || [];

    const slotsSelectedByOtherUsers = unexpiredSelectedSlots.filter((slot) => slot.uid !== bookerClientUid);

    await this.cleanupExpiredSlots({ eventTypeId });

    return slotsSelectedByOtherUsers;
  }

  /**
   * Cleans up expired slots
   */
  private async cleanupExpiredSlots({ eventTypeId }: { eventTypeId: number }): Promise<void> {
    const currentTimeInUtc = dayjs.utc().format();
    await prisma.selectedSlots.deleteMany({
      where: {
        eventTypeId: { equals: eventTypeId },
        releaseAt: { lt: currentTimeInUtc },
      },
    });
  }
}

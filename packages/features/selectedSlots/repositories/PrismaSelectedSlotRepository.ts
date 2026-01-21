import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import type { ISelectedSlotRepository } from "./ISelectedSlotRepository";
import type { TimeSlot } from "./ISelectedSlotRepository";

export class PrismaSelectedSlotRepository implements ISelectedSlotRepository {
  constructor(private prismaClient: PrismaClient) {}

  private async findFirst({ where }: { where: Prisma.SelectedSlotsWhereInput }) {
    return await this.prismaClient.selectedSlots.findFirst({
      where,
    });
  }

  async findReservedByOthers({
    slot,
    eventTypeId,
    uid,
  }: {
    slot: TimeSlot;
    eventTypeId: number;
    uid: string;
  }) {
    return await this.findFirst({
      where: {
        slotUtcStartDate: slot.utcStartIso,
        slotUtcEndDate: slot.utcEndIso,
        eventTypeId,
        uid: { not: uid },
        releaseAt: { gt: new Date() },
      },
    });
  }

  async findManyReservedByOthers(slots: TimeSlot[], eventTypeId: number, uid: string) {
    return await this.prismaClient.selectedSlots.findMany({
      where: {
        OR: slots.map((slot) => ({
          slotUtcStartDate: slot.utcStartIso,
          slotUtcEndDate: slot.utcEndIso,
          eventTypeId,
          uid: { not: uid },
          releaseAt: { gt: new Date() },
        })),
      },
      select: {
        slotUtcStartDate: true,
        slotUtcEndDate: true,
      },
    });
  }

  async findManyUnexpiredSlots({
    userIds,
    currentTimeInUtc,
  }: {
    userIds: number[];
    currentTimeInUtc: string;
  }) {
    return this.prismaClient.selectedSlots.findMany({
      where: {
        userId: { in: userIds },
        releaseAt: { gt: currentTimeInUtc },
      },
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
  }

  async deleteManyExpiredSlots({
    eventTypeId,
    currentTimeInUtc,
  }: {
    eventTypeId: number;
    currentTimeInUtc: string;
  }) {
    return this.prismaClient.selectedSlots.deleteMany({
      where: {
        eventTypeId: { equals: eventTypeId },
        releaseAt: { lt: currentTimeInUtc },
      },
    });
  }
}

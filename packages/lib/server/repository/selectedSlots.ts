import type { Prisma } from "@prisma/client";

import type { PrismaClient, PrismaTransaction } from "@calcom/prisma";

type WhereCondition = {
  slotUtcStartDate?: Date | string;
  slotUtcEndDate?: Date | string;
  eventTypeId?: number;
  uid?: string | { not: string };
  releaseAt?: { gt: Date };
};

export type FindManyArgs = {
  where?: WhereCondition & {
    OR?: WhereCondition[];
  };
  select?: Prisma.SelectedSlotsSelect;
};

export type TimeSlot = {
  utcStartIso: string;
  utcEndIso: string;
};

export class SelectedSlotsRepository {
  constructor(private prismaClient: PrismaTransaction | PrismaClient) {}

  async findMany({ where, select }: FindManyArgs) {
    return await (this.prismaClient as any).selectedSlots.findMany({ where, select });
  }

  async findFirst({ where }: { where: Prisma.SelectedSlotsWhereInput }) {
    return await (this.prismaClient as any).selectedSlots.findFirst({
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
    return await this.findMany({
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
    return (this.prismaClient as any).selectedSlots.findMany({
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
    return (this.prismaClient as any).selectedSlots.deleteMany({
      where: {
        eventTypeId: { equals: eventTypeId },
        releaseAt: { lt: currentTimeInUtc },
      },
    });
  }
}

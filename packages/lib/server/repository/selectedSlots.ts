import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";

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
  static async findMany({ where, select }: FindManyArgs) {
    return await prisma.selectedSlots.findMany({ where, select });
  }

  static async findFirst({ where }: { where: Prisma.SelectedSlotsWhereInput }) {
    return await prisma.selectedSlots.findFirst({
      where,
    });
  }

  static async findReservedByOthers({
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

  static async findManyReservedByOthers(slots: TimeSlot[], eventTypeId: number, uid: string) {
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
}

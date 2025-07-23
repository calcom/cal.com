import type { PrismaClient } from "@calcom/prisma";

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
  select?: any;
};

export type TimeSlot = {
  utcStartIso: string;
  utcEndIso: string;
};

export interface SelectedSlotRepositoryInterface {
  findMany(args: any): Promise<any[]>;
  findFirst(args: any): Promise<any | null>;
  findReservedByOthers(args: { slot: TimeSlot; eventTypeId: number; uid: string }): Promise<any | null>;
  findManyReservedByOthers(
    slots: TimeSlot[],
    eventTypeId: number,
    uid: string
  ): Promise<
    Array<{
      slotUtcStartDate: Date;
      slotUtcEndDate: Date;
    }>
  >;
  findManyUnexpiredSlots(args: { userIds: number[]; currentTimeInUtc: string }): Promise<
    Array<{
      id: number;
      slotUtcStartDate: Date;
      slotUtcEndDate: Date;
      userId: number | null;
      isSeat: boolean;
      eventTypeId: number;
      uid: string;
    }>
  >;
  deleteManyExpiredSlots(args: { eventTypeId: number; currentTimeInUtc: string }): Promise<{ count: number }>;
}

export class PrismaSelectedSlotRepository implements SelectedSlotRepositoryInterface {
  constructor(private prismaClient: PrismaClient) {}

  async findMany({ where, select }: any) {
    return await this.prismaClient.selectedSlots.findMany({ where, select });
  }

  async findFirst({ where }: any) {
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

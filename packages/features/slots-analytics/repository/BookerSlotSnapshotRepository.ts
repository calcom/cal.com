import type { PrismaClient } from "@calcom/prisma";
import type { IBookerSlotSnapshotRepository } from "./IBookerSlotSnapshotRepository";

export class BookerSlotSnapshotRepository implements IBookerSlotSnapshotRepository {
  constructor(private prismaClient: PrismaClient) {}

  async create(data: { eventTypeId: number; firstSlotLeadTime: number }): Promise<{ id: number }> {
    return this.prismaClient.bookerSlotSnapshot.create({
      data: {
        eventTypeId: data.eventTypeId,
        firstSlotLeadTime: data.firstSlotLeadTime,
      },
      select: {
        id: true,
      },
    });
  }
}

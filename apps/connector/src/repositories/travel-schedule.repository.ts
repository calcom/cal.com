import { BaseRepository } from "./base.repository";
import type { PrismaClient } from "@calcom/prisma";

export interface TravelScheduleRecord {
  id: number;
  userId: number;
  startDate: Date;
  endDate: Date | null;
  timeZone: string;
}

export class TravelScheduleRepository extends BaseRepository<TravelScheduleRecord> {
  constructor(prisma: PrismaClient) {
    // @ts-expect-error BaseRepository generic id constraint; model has id
    super(prisma);
  }

  async findManyByUser(userId: number) {
    try {
      return await this.prisma.travelSchedule.findMany({ where: { userId } });
    } catch (error) {
      this.handleDatabaseError(error, "find many travel schedules by user");
    }
  }

  async deleteManyByIdsForUser(ids: number[], userId: number) {
    try {
      await this.prisma.travelSchedule.deleteMany({ where: { id: { in: ids }, userId } });
    } catch (error) {
      this.handleDatabaseError(error, "delete many travel schedules");
    }
  }

  async createMany(records: Array<Omit<TravelScheduleRecord, "id">>) {
    try {
      if (!records.length) return;
      await this.prisma.travelSchedule.createMany({ data: records });
    } catch (error) {
      this.handleDatabaseError(error, "create many travel schedules");
    }
  }
}



import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type { HostDto, IHostRepository } from "./IHostRepository";

export class KyselyHostRepository implements IHostRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  async updateHostsSchedule(
    userId: number,
    oldScheduleId: number,
    newScheduleId: number
  ): Promise<{ count: number }> {
    const result = await this.writeDb
      .updateTable("Host")
      .set({ scheduleId: newScheduleId })
      .where("userId", "=", userId)
      .where("scheduleId", "=", oldScheduleId)
      .executeTakeFirst();

    return { count: Number(result.numUpdatedRows) };
  }

  async findHostsCreatedInInterval(params: {
    eventTypeId: number;
    userIds: number[];
    startDate: Date;
  }): Promise<HostDto[]> {
    const results = await this.readDb
      .selectFrom("Host")
      .selectAll()
      .where("userId", "in", params.userIds)
      .where("eventTypeId", "=", params.eventTypeId)
      .where("isFixed", "=", false)
      .where("createdAt", ">=", params.startDate)
      .execute();

    return results.map((row) => ({
      id: row.id,
      userId: row.userId,
      eventTypeId: row.eventTypeId,
      isFixed: row.isFixed,
      priority: row.priority,
      weight: row.weight,
      weightAdjustment: row.weightAdjustment,
      scheduleId: row.scheduleId,
      createdAt: row.createdAt,
    }));
  }
}

import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type { ITravelScheduleRepository, TravelScheduleDto } from "./ITravelScheduleRepository";

export class KyselyTravelScheduleRepository implements ITravelScheduleRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  async findTravelSchedulesByUserId(userId: number): Promise<TravelScheduleDto[]> {
    const results = await this.readDb
      .selectFrom("TravelSchedule")
      .select(["id", "startDate", "endDate", "timeZone"])
      .where("userId", "=", userId)
      .execute();

    return results;
  }
}
